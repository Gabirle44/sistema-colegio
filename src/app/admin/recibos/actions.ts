"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { estadoSegunPago } from "@/lib/cobros/cargos";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { aCentavos, deCentavos, numeroRecibo } from "@/lib/cobros/utils";

export async function anularRecibo(
  reciboId: number,
  _prev: AccionState,
  fd: FormData,
): Promise<AccionState> {
  const sesion = await requireAdmin();
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (motivo.length < 5) return { error: "Escribe el motivo de la anulación (mínimo 5 letras)." };

  try {
    await prisma.$transaction(
      async (tx) => {
        const r = await tx.recibo.findUnique({ where: { id: reciboId }, include: { detalles: true } });
        if (!r) throw new ErrorNegocio("El recibo no existe.");
        if (r.estado === "ANULADO") throw new ErrorNegocio("Este recibo ya está anulado.");

        for (const d of r.detalles) {
          const c = await tx.cargo.findUniqueOrThrow({ where: { id: d.cargoId } });
          const pagado = Math.max(0, aCentavos(c.pagado) - aCentavos(d.monto));
          const neto = aCentavos(c.monto) - aCentavos(c.descuento);
          await tx.cargo.update({
            where: { id: c.id },
            data: { pagado: deCentavos(pagado), estado: estadoSegunPago(neto, pagado) },
          });
        }
        await tx.recibo.update({
          where: { id: reciboId },
          data: { estado: "ANULADO", motivoAnulacion: motivo, anuladoEn: new Date(), anuladoPorId: sesion.userId },
        });
        await registrarBitacora(tx, {
          usuarioId: sesion.userId, accion: "RECIBO_ANULADO", entidad: "Recibo", entidadId: reciboId,
          detalle: `${numeroRecibo(r)}: ${motivo}`,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: "Recibo anulado. Las cuotas volvieron a quedar pendientes." };
}
