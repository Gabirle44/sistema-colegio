"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { requireActor } from "@/lib/notas/acceso";

// 1. Acción para que el maestro publique una nueva tarea
export async function crearTarea(
  asignacionId: number, _prev: AccionState, fd: FormData
): Promise<AccionState> {
  const actor = await requireActor();
  
  try {
    const titulo = String(fd.get("titulo") ?? "").trim();
    const descripcion = String(fd.get("descripcion") ?? "").trim() || null;
    const fechaEntrega = String(fd.get("fechaEntrega") ?? "").trim();
    const puntos = parseFloat(String(fd.get("puntos") ?? "0"));

    if (!titulo) throw new ErrorNegocio("El título de la tarea es obligatorio.");
    if (!fechaEntrega) throw new ErrorNegocio("La fecha de entrega es obligatoria.");
    if (isNaN(puntos) || puntos < 0) throw new ErrorNegocio("Los puntos deben ser un número positivo.");

    await prisma.$transaction(async (tx) => {
      const asig = await tx.asignacionCurso.findUnique({
        where: { id: asignacionId },
        include: { curso: true, seccion: { include: { grado: true } } },
      });
      if (!asig) throw new ErrorNegocio("La asignación no existe.");
      if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) {
        throw new ErrorNegocio("No tienes permiso para crear tareas en este curso.");
      }

      const nuevaTarea = await tx.tarea.create({
        data: {
          asignacionId,
          titulo,
          descripcion,
          fechaEntrega: new Date(fechaEntrega),
          puntos,
        },
      });

      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId, 
        accion: "CREAR_TAREA", 
        entidad: "Tarea", 
        entidadId: nuevaTarea.id,
        detalle: `${asig.curso.nombre} · ${asig.seccion.grado.nombre} ${asig.seccion.nombre} · Tarea: ${titulo}`,
      });

      return nuevaTarea.id;
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/maestro", "layout");
    return { ok: `Tarea "${titulo}" creada correctamente.` };
  } catch (e) {
    return aEstadoError(e);
  }
}

// 2. Acción para marcar qué alumnos entregaron la tarea (Patrón idéntico a asistencia)
export async function guardarEntregas(
  tareaId: number, _prev: AccionState, fd: FormData
): Promise<AccionState> {
  const actor = await requireActor();
  
  try {
    const n = await prisma.$transaction(async (tx) => {
      const tarea = await tx.tarea.findUnique({
        where: { id: tareaId },
        include: { 
          asignacion: { 
            include: { curso: true, seccion: { include: { grado: true } } } 
          } 
        },
      });
      if (!tarea) throw new ErrorNegocio("La tarea no existe.");
      if (actor.rol === "MAESTRO" && tarea.asignacion.maestroId !== actor.maestroId) {
        throw new ErrorNegocio("No tienes permiso para calificar esta tarea.");
      }

      const inscripciones = await tx.inscripcion.findMany({
        where: { 
          seccionId: tarea.asignacion.seccionId, 
          cicloId: tarea.asignacion.seccion.cicloId 
        }, 
        select: { id: true },
      });

      let guardados = 0;
      for (const ins of inscripciones) {
        // La vista mandará un checkbox "entregado_ID" y un input numérico "nota_ID"
        const entregado = fd.get(`entregado_${ins.id}`) === "on";
        const notaStr = String(fd.get(`nota_${ins.id}`) ?? "");
        
        // Si no entregó y no hay nota, podemos omitir o limpiar el registro
        if (!entregado && notaStr === "") {
            await tx.entregaTarea.deleteMany({
                where: { tareaId, inscripcionId: ins.id }
            });
            continue;
        }

        const nota = notaStr !== "" ? parseFloat(notaStr) : null;
        if (nota !== null && (isNaN(nota) || nota < 0 || nota > Number(tarea.puntos))) {
            throw new ErrorNegocio(`La nota del alumno es inválida o supera los ${tarea.puntos} puntos.`);
        }

        const clave = { tareaId_inscripcionId: { tareaId, inscripcionId: ins.id } };
        
        await tx.entregaTarea.upsert({
          where: clave,
          update: { entregado, nota, fecha: entregado ? new Date() : null },
          create: { tareaId, inscripcionId: ins.id, entregado, nota, fecha: entregado ? new Date() : null },
        });
        
        guardados++;
      }

      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId, 
        accion: "CALIFICAR_TAREA", 
        entidad: "Tarea", 
        entidadId: tareaId,
        detalle: `${tarea.asignacion.curso.nombre} · ${tarea.titulo} · ${guardados} entregas marcadas`,
      });

      return guardados;
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/maestro", "layout");
    return { ok: `Entregas guardadas (${n} alumno(s)).` };
  } catch (e) {
    return aEstadoError(e);
  }
}