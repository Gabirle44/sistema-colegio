"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";

// Cambia al alumno de sección dentro del MISMO grado y MISMO ciclo.
// Cargos, recibos y notas no se tocan: las notas van por curso, que es el mismo en todas las secciones del grado.
export async function cambiarSeccion(inscripcionId: number, _prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const seccionId = Number(String(fd.get("seccionId") ?? ""));
  if (!Number.isInteger(seccionId) || seccionId <= 0) return { error: "Elige la sección." };

  try {
    await prisma.$transaction(async (tx) => {
      const ins = await tx.inscripcion.findUnique({
        where: { id: inscripcionId },
        include: { seccion: { include: { grado: true } }, alumno: true },
      });
      if (!ins) throw new ErrorNegocio("Inscripción no encontrada.");
      if (ins.seccionId === seccionId) throw new ErrorNegocio("El alumno ya está en esa sección.");
      const nueva = await tx.seccion.findUnique({ where: { id: seccionId }, include: { grado: true } });
      if (!nueva) throw new ErrorNegocio("Sección no válida.");
      if (nueva.cicloId !== ins.cicloId) throw new ErrorNegocio("La sección es de otro ciclo.");
      if (nueva.gradoId !== ins.seccion.gradoId) {
        throw new ErrorNegocio("Solo se puede cambiar de sección dentro del mismo grado. Para cambiar de grado usa Promoción.");
      }
      await tx.inscripcion.update({ where: { id: inscripcionId }, data: { seccionId } });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "CAMBIO_SECCION", entidad: "Inscripcion", entidadId: inscripcionId,
        detalle: `${ins.alumno.apellidos}, ${ins.alumno.nombres}: ${ins.seccion.grado.nombre} ${ins.seccion.nombre} → ${nueva.nombre}`,
      });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: "Sección actualizada." };
}
