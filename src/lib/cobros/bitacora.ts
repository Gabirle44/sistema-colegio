import type { Prisma } from "@prisma/client";

type Db = Pick<Prisma.TransactionClient, "bitacora">;

export async function registrarBitacora(
  db: Db,
  e: { usuarioId: number; accion: string; entidad: string; entidadId?: number; detalle?: string },
) {
  await db.bitacora.create({
    data: {
      usuarioId: e.usuarioId,
      accion: e.accion,
      entidad: e.entidad,
      entidadId: e.entidadId ?? null,
      detalle: e.detalle ?? null,
    },
  });
}
