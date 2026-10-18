"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { deCentavos, nombreMes, parseCentavos, quetzales } from "@/lib/cobros/utils";

export async function registrarPagoMaestro(
  maestroId: number, mes: number, anio: number, _prev: AccionState, fd: FormData,
): Promise<AccionState> {
  const sesion = await requireAdmin();
  const monto = parseCentavos(fd.get("monto"));
  const observaciones = String(fd.get("observaciones") ?? "").trim();
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return { error: "Periodo no válido." };
  }
  if (monto === null || monto <= 0) return { error: "Escribe un monto mayor que cero." };
  try {
    await prisma.$transaction(async (tx) => {
      const m = await tx.maestro.findUnique({ where: { id: maestroId } });
      if (!m) throw new ErrorNegocio("Maestro no encontrado.");
      if (!m.activo) throw new ErrorNegocio("El maestro está inactivo.");
      const ya = await tx.pagoMaestro.findUnique({ where: { maestroId_mes_anio: { maestroId, mes, anio } } });
      if (ya) throw new ErrorNegocio(`Ya se registró el pago de ${nombreMes(mes)} ${anio}.`);
      const p = await tx.pagoMaestro.create({
        data: { maestroId, mes, anio, monto: deCentavos(monto), observaciones: observaciones || null, registradoPorId: sesion.userId },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "PAGO_MAESTRO", entidad: "PagoMaestro", entidadId: p.id,
        detalle: `${m.nombres} ${m.apellidos} · ${nombreMes(mes)} ${anio} · ${quetzales(monto)}`,
      });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: "Pago registrado." };
}

// Elimina un pago registrado por error. Queda constancia en la bitácora.
export async function eliminarPagoMaestro(pagoId: number) {
  const sesion = await requireAdmin();
  const p = await prisma.pagoMaestro.findUnique({ where: { id: pagoId }, include: { maestro: true } });
  if (!p) return;
  await prisma.$transaction(async (tx) => {
    await tx.pagoMaestro.delete({ where: { id: pagoId } });
    await registrarBitacora(tx, {
      usuarioId: sesion.userId, accion: "PAGO_MAESTRO_ELIMINADO", entidad: "PagoMaestro", entidadId: pagoId,
      detalle: `${p.maestro.nombres} ${p.maestro.apellidos} · ${nombreMes(p.mes)} ${p.anio} · Q${p.monto}`,
    });
  });
  revalidatePath("/admin", "layout");
}
