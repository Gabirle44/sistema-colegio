"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { deCentavos, nombreMes, parseCentavos, quetzales } from "@/lib/cobros/utils";
import {
  BONIFICACION_INCENTIVO_LEY_CENTAVOS,
  calcularPlanillaMaestro,
} from "@/lib/maestros/planilla";

export async function registrarPagoMaestro(
  maestroId: number,
  mes: number,
  anio: number,
  _prev: AccionState,
  fd: FormData,
): Promise<AccionState> {
  const sesion = await requireAdmin();

  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return { error: "Periodo no válido." };
  }

  const sueldoBaseRaw = parseCentavos(fd.get("sueldoBase") ?? fd.get("monto"));
  const bonifRaw = parseCentavos(fd.get("bonificacion"), { vacioEsCero: true });
  const horasExtraRaw = parseCentavos(fd.get("horasExtra"), { vacioEsCero: true });
  const descuentosRaw = parseCentavos(fd.get("descuentos"), { vacioEsCero: true });
  const observaciones = String(fd.get("observaciones") ?? "").trim();

  if (sueldoBaseRaw === null || sueldoBaseRaw <= 0) {
    return { error: "Escribe un sueldo base válido mayor que cero." };
  }
  if (bonifRaw === null || bonifRaw < 0) {
    return { error: "La bonificación incentivo no puede ser negativa." };
  }
  if (horasExtraRaw === null || horasExtraRaw < 0) {
    return { error: "El monto de horas extra no puede ser negativo." };
  }
  if (descuentosRaw === null || descuentosRaw < 0) {
    return { error: "El monto de descuentos no puede ser negativo." };
  }

  const desglose = calcularPlanillaMaestro({
    sueldoBaseCentavos: sueldoBaseRaw,
    bonificacionCentavos: bonifRaw ?? BONIFICACION_INCENTIVO_LEY_CENTAVOS,
    horasExtraCentavos: horasExtraRaw ?? 0,
    descuentosCentavos: descuentosRaw ?? 0,
  });

  try {
    await prisma.$transaction(async (tx) => {
      const m = await tx.maestro.findUnique({ where: { id: maestroId } });
      if (!m) throw new ErrorNegocio("Maestro no encontrado.");
      if (!m.activo) throw new ErrorNegocio("El maestro está inactivo.");

      const ya = await tx.pagoMaestro.findUnique({
        where: { maestroId_mes_anio: { maestroId, mes, anio } },
      });
      if (ya) throw new ErrorNegocio(`Ya se registró el pago de ${nombreMes(mes)} ${anio}.`);

      const p = await tx.pagoMaestro.create({
        data: {
          maestroId,
          mes,
          anio,
          sueldoBase: deCentavos(desglose.sueldoBaseCentavos),
          bonificacion: deCentavos(desglose.bonificacionCentavos),
          horasExtra: deCentavos(desglose.horasExtraCentavos),
          igss: deCentavos(desglose.igssCentavos),
          descuentos: deCentavos(desglose.descuentosCentavos),
          monto: deCentavos(desglose.liquidoCentavos), // Líquido a recibir
          observaciones: observaciones || null,
          registradoPorId: sesion.userId,
        },
      });

      await registrarBitacora(tx, {
        usuarioId: sesion.userId,
        accion: "PAGO_MAESTRO",
        entidad: "PagoMaestro",
        entidadId: p.id,
        detalle: `${m.nombres} ${m.apellidos} · ${nombreMes(mes)} ${anio} · Base: ${quetzales(desglose.sueldoBaseCentavos)}, Bono: ${quetzales(desglose.bonificacionCentavos)}, IGSS: -${quetzales(desglose.igssCentavos)}, Líquido: ${quetzales(desglose.liquidoCentavos)}`,
      });
    });
  } catch (e) {
    return aEstadoError(e);
  }

  revalidatePath("/admin", "layout");
  return { ok: `Pago registrado. Líquido a recibir: ${quetzales(desglose.liquidoCentavos)}.` };
}

// Elimina un pago registrado por error. Queda constancia en la bitácora.
export async function eliminarPagoMaestro(pagoId: number) {
  const sesion = await requireAdmin();
  const p = await prisma.pagoMaestro.findUnique({
    where: { id: pagoId },
    include: { maestro: true },
  });
  if (!p) return;

  await prisma.$transaction(async (tx) => {
    await tx.pagoMaestro.delete({ where: { id: pagoId } });
    await registrarBitacora(tx, {
      usuarioId: sesion.userId,
      accion: "PAGO_MAESTRO_ELIMINADO",
      entidad: "PagoMaestro",
      entidadId: pagoId,
      detalle: `${p.maestro.nombres} ${p.maestro.apellidos} · ${nombreMes(p.mes)} ${p.anio} · Q${p.monto}`,
    });
  });

  revalidatePath("/admin", "layout");
}
