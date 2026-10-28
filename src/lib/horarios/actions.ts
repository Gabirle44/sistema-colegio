"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { esFormatoHoraValido, detectarChoques } from "./validaciones";

export async function crearBloqueHorarioAction(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const actor = await requireActor();
  if (actor.rol !== "ADMIN") {
    return { error: "Solo los administradores pueden gestionar horarios." };
  }

  try {
    const asignacionId = Number(formData.get("asignacionId"));
    const diaSemana = Number(formData.get("diaSemana"));
    const horaInicio = String(formData.get("horaInicio") ?? "").trim();
    const horaFin = String(formData.get("horaFin") ?? "").trim();

    if (!asignacionId || Number.isNaN(asignacionId)) {
      throw new ErrorNegocio("Debes seleccionar una clase/asignación.");
    }

    if (!diaSemana || diaSemana < 1 || diaSemana > 6) {
      throw new ErrorNegocio("Día de la semana no válido.");
    }

    if (!esFormatoHoraValido(horaInicio) || !esFormatoHoraValido(horaFin)) {
      throw new ErrorNegocio("Formato de hora no válido. Debe ser HH:mm (ej. 07:30).");
    }

    if (horaInicio >= horaFin) {
      throw new ErrorNegocio("La hora de inicio debe ser anterior a la hora de fin.");
    }

    // Verificar si hay choque de sección o de maestro
    const choque = await detectarChoques({
      asignacionId,
      diaSemana,
      horaInicio,
      horaFin,
    });

    if (choque) {
      throw new ErrorNegocio(choque.mensaje);
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const asignacion = await tx.asignacionCurso.findUniqueOrThrow({
        where: { id: asignacionId },
        include: {
          curso: true,
          maestro: true,
          seccion: { include: { grado: true } },
        },
      });

      const bloque = await tx.bloqueHorario.create({
        data: {
          asignacionId,
          diaSemana,
          horaInicio,
          horaFin,
        },
      });

      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId,
        accion: "CREAR_BLOQUE_HORARIO",
        entidad: "BloqueHorario",
        entidadId: bloque.id,
        detalle: `Horario creado: ${asignacion.curso.nombre} (${asignacion.seccion.grado.nombre} ${asignacion.seccion.nombre}) día ${diaSemana} de ${horaInicio} a ${horaFin}`,
      });

      return bloque;
    });

    revalidatePath("/admin/horarios");
    revalidatePath("/maestro/horario");

    return { ok: `Bloque agregado correctamente (${resultado.horaInicio} - ${resultado.horaFin}).` };
  } catch (error) {
    return aEstadoError(error);
  }
}

export async function eliminarBloqueHorarioAction(
  bloqueId: number,
): Promise<AccionState> {
  const actor = await requireActor();
  if (actor.rol !== "ADMIN") {
    return { error: "Solo los administradores pueden gestionar horarios." };
  }

  try {
    if (!bloqueId || Number.isNaN(bloqueId)) {
      throw new ErrorNegocio("Identificador de bloque no válido.");
    }

    await prisma.$transaction(async (tx) => {
      const bloque = await tx.bloqueHorario.findUnique({
        where: { id: bloqueId },
        include: {
          asignacion: {
            include: {
              curso: true,
              seccion: { include: { grado: true } },
            },
          },
        },
      });

      if (!bloque) {
        throw new ErrorNegocio("El bloque horario ya no existe.");
      }

      await tx.bloqueHorario.delete({
        where: { id: bloqueId },
      });

      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId,
        accion: "ELIMINAR_BLOQUE_HORARIO",
        entidad: "BloqueHorario",
        entidadId: bloqueId,
        detalle: `Bloque eliminado: ${bloque.asignacion.curso.nombre} (${bloque.asignacion.seccion.grado.nombre} ${bloque.asignacion.seccion.nombre}) ${bloque.horaInicio}-${bloque.horaFin}`,
      });
    });

    revalidatePath("/admin/horarios");
    revalidatePath("/maestro/horario");

    return { ok: "Bloque eliminado del horario." };
  } catch (error) {
    return aEstadoError(error);
  }
}
