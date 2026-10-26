import { prisma } from "@/lib/prisma";

/**
 * Cuenta las ausencias de un alumno en un período escolar específico.
 * Se consideran ausencias únicamente los registros con estado "AUSENTE".
 * Las llegadas tardes NO cuentan como inasistencia completa.
 */
export async function contarInasistenciasPorPeriodo(
  inscripcionId: string | number,
  periodoId?: string | number
): Promise<number> {
  const idNum = typeof inscripcionId === "string" ? parseInt(inscripcionId, 10) : inscripcionId;

  const ausencias = await prisma.asistencia.count({
    where: {
      inscripcionId: idNum,
      estado: "AUSENTE",
    },
  });

  return ausencias;
}