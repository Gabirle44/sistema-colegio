"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAsistencia } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { isoHoyGT } from "@/lib/cobros/utils";
import { requireActor } from "@/lib/notas/acceso";
import { ESTADOS, esFechaIso, fechaDb } from "./utils";

// Guarda la asistencia de un curso/sección en una fecha. Casilla sin marcar = sin registro.
export async function guardarAsistencia(
  asignacionId: number, fecha: string, _prev: AccionState, fd: FormData,
): Promise<AccionState> {
  const actor = await requireActor();
  try {
    if (!esFechaIso(fecha)) throw new ErrorNegocio("Fecha no válida.");
    if (fecha > isoHoyGT()) throw new ErrorNegocio("No se puede registrar asistencia de una fecha futura.");

    const n = await prisma.$transaction(async (tx) => {
      const asig = await tx.asignacionCurso.findUnique({
        where: { id: asignacionId },
        include: { curso: true, seccion: { include: { grado: true } } },
      });
      if (!asig) throw new ErrorNegocio("La asignación no existe.");
      if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) throw new ErrorNegocio("Ese curso no está asignado a ti.");

      const inscripciones = await tx.inscripcion.findMany({
        where: { seccionId: asig.seccionId, cicloId: asig.seccion.cicloId }, select: { id: true },
      });
      const f = fechaDb(fecha);
      let guardados = 0;
      for (const ins of inscripciones) {
        if (!fd.has(`estado_${ins.id}`)) continue;
        const valor = String(fd.get(`estado_${ins.id}`) ?? "");
        const obs = String(fd.get(`obs_${ins.id}`) ?? "").trim().slice(0, 200) || null;
        const clave = { asignacionId_inscripcionId_fecha: { asignacionId, inscripcionId: ins.id, fecha: f } };
        if (valor === "") {
          await tx.asistencia.deleteMany({ where: { asignacionId, inscripcionId: ins.id, fecha: f } });
          continue;
        }
        if (!(ESTADOS as readonly string[]).includes(valor)) throw new ErrorNegocio("Estado de asistencia no válido.");
        const estado = valor as EstadoAsistencia;
        await tx.asistencia.upsert({
          where: clave,
          update: { estado, observacion: estado === "PRESENTE" ? null : obs },
          create: { asignacionId, inscripcionId: ins.id, fecha: f, estado, observacion: estado === "PRESENTE" ? null : obs },
        });
        guardados++;
      }
      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId, accion: "ASISTENCIA", entidad: "Asistencia", entidadId: asignacionId,
        detalle: `${asig.curso.nombre} · ${asig.seccion.grado.nombre} ${asig.seccion.nombre} · ${fecha}: ${guardados} alumno(s)`,
      });
      return guardados;
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/maestro", "layout");
    return { ok: `Asistencia guardada (${n} alumno(s)).` };
  } catch (e) {
    return aEstadoError(e);
  }
}
