"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { estadoSegunPago, saldoCentavos } from "@/lib/cobros/cargos";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { aCentavos, deCentavos, esVencido, hoyGT, parseCentavos, quetzales } from "@/lib/cobros/utils";

const METODOS = ["EFECTIVO", "TRANSFERENCIA", "DEPOSITO", "CHEQUE"] as const;
type Metodo = (typeof METODOS)[number];

export async function registrarPago(
  inscripcionId: number,
  _prev: AccionState,
  fd: FormData,
): Promise<AccionState> {
  const sesion = await requireAdmin();

  const metodo = String(fd.get("metodo") ?? "") as Metodo;
  if (!METODOS.includes(metodo)) return { error: "Elige el método de pago." };
  const referencia = String(fd.get("referencia") ?? "").trim();
  if (metodo !== "EFECTIVO" && !referencia) {
    return { error: "Escribe el número de boleta / referencia del pago." };
  }
  const observaciones = String(fd.get("observaciones") ?? "").trim();
  const cobrarRecargo = fd.get("cobrarRecargo") === "on";

  // Cargos marcados y cuánto se paga de cada uno
  const pagos: { cargoId: number; centavos: number }[] = [];
  for (const [clave] of fd.entries()) {
    const m = /^cargo_(\d+)$/.exec(clave);
    if (!m) continue;
    const cargoId = Number(m[1]);
    const centavos = parseCentavos(fd.get(`monto_${cargoId}`));
    if (centavos === null || centavos <= 0) {
      return { error: "Revisa los montos: deben ser números mayores a cero." };
    }
    pagos.push({ cargoId, centavos });
  }
  if (pagos.length === 0) return { error: "Marca al menos una cuota para cobrar." };

  let reciboId: number;
  try {
    reciboId = await prisma.$transaction(
      async (tx) => {
        const cfg = await tx.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
        const cargos = await tx.cargo.findMany({
          where: { id: { in: pagos.map((p) => p.cargoId) }, inscripcionId },
          include: { recargo: true },
        });
        if (cargos.length !== pagos.length) throw new ErrorNegocio("Alguna cuota no pertenece a esta inscripción.");

        const lineas: { cargoId: number; centavos: number }[] = [];
        for (const p of pagos) {
          const c = cargos.find((x) => x.id === p.cargoId)!;
          if (c.estado === "PAGADO" || c.estado === "ANULADO") {
            throw new ErrorNegocio(`"${c.descripcion}" ya no tiene saldo pendiente.`);
          }
          const saldo = saldoCentavos(c);
          if (p.centavos > saldo) {
            throw new ErrorNegocio(`"${c.descripcion}": el pago (${quetzales(p.centavos)}) supera el saldo (${quetzales(saldo)}).`);
          }
          lineas.push(p);
        }

        // Recargo por mora opcional: se crea y se cobra completo en este mismo recibo
        const recargoMonto = aCentavos(cfg.recargoMora);
        if (cobrarRecargo && recargoMonto > 0) {
          for (const c of cargos) {
            if (c.concepto !== "MENSUALIDAD" || c.recargo) continue;
            if (!esVencido(c.fechaVencimiento, cfg.diasGracia)) continue;
            const r = await tx.cargo.create({
              data: {
                inscripcionId,
                concepto: "RECARGO",
                descripcion: `Recargo por mora - ${c.descripcion}`,
                monto: deCentavos(recargoMonto),
                fechaVencimiento: hoyGT(),
                recargoDeId: c.id,
              },
            });
            lineas.push({ cargoId: r.id, centavos: recargoMonto });
          }
        }

        const total = lineas.reduce((s, l) => s + l.centavos, 0);
        const recibo = await tx.recibo.create({
          data: {
            serie: cfg.serieRecibo,
            inscripcionId,
            total: deCentavos(total),
            metodo,
            referencia: referencia || null,
            observaciones: observaciones || null,
            emitidoPorId: sesion.userId,
            detalles: { create: lineas.map((l) => ({ cargoId: l.cargoId, monto: deCentavos(l.centavos) })) },
          },
        });

        for (const l of lineas) {
          const c = await tx.cargo.findUniqueOrThrow({ where: { id: l.cargoId } });
          const pagado = aCentavos(c.pagado) + l.centavos;
          const neto = aCentavos(c.monto) - aCentavos(c.descuento);
          await tx.cargo.update({
            where: { id: c.id },
            data: { pagado: deCentavos(pagado), estado: estadoSegunPago(neto, pagado) },
          });
        }

        await registrarBitacora(tx, {
          usuarioId: sesion.userId,
          accion: "PAGO",
          entidad: "Recibo",
          entidadId: recibo.id,
          detalle: `Recibo ${recibo.serie}-${String(recibo.numero).padStart(6, "0")} por ${quetzales(total)} (${metodo})`,
        });
        return recibo.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    return aEstadoError(e);
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/recibos/${reciboId}`);
}

export async function crearCargoExtra(
  inscripcionId: number,
  _prev: AccionState,
  fd: FormData,
): Promise<AccionState> {
  const sesion = await requireAdmin();
  const descripcion = String(fd.get("descripcion") ?? "").trim();
  const monto = parseCentavos(fd.get("monto"));
  const vence = String(fd.get("vencimiento") ?? "");
  if (descripcion.length < 3) return { error: "Escribe una descripción (ej. Uniforme, Libros, Excursión)." };
  if (monto === null || monto <= 0) return { error: "El monto debe ser mayor a cero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vence)) return { error: "Elige la fecha de vencimiento." };

  try {
    await prisma.$transaction(async (tx) => {
      const c = await tx.cargo.create({
        data: {
          inscripcionId,
          concepto: "OTRO",
          descripcion,
          monto: deCentavos(monto),
          fechaVencimiento: new Date(`${vence}T00:00:00.000Z`),
        },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "CARGO_EXTRA", entidad: "Cargo", entidadId: c.id,
        detalle: `${descripcion} por ${quetzales(monto)}`,
      });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath(`/admin/cobros/${inscripcionId}`);
  return { ok: "Cobro agregado al estado de cuenta." };
}

export async function anularCargo(cargoId: number, inscripcionId: number) {
  const sesion = await requireAdmin();
  const c = await prisma.cargo.findUnique({ where: { id: cargoId } });
  if (!c || c.inscripcionId !== inscripcionId) return;
  if (c.concepto === "MENSUALIDAD" || c.concepto === "INSCRIPCION") return;
  if (aCentavos(c.pagado) > 0 || c.estado === "ANULADO") return;
  await prisma.$transaction(async (tx) => {
    await tx.cargo.update({ where: { id: cargoId }, data: { estado: "ANULADO" } });
    await registrarBitacora(tx, {
      usuarioId: sesion.userId, accion: "CARGO_ANULADO", entidad: "Cargo", entidadId: cargoId, detalle: c.descripcion,
    });
  });
  revalidatePath(`/admin/cobros/${inscripcionId}`);
}

// Beca / descuento: se aplica a las cuotas de ese tipo que todavía no tienen pagos
export async function aplicarDescuento(
  inscripcionId: number,
  _prev: AccionState,
  fd: FormData,
): Promise<AccionState> {
  const sesion = await requireAdmin();
  const tipo = String(fd.get("tipo") ?? "");
  const valor = parseCentavos(fd.get("monto"), { vacioEsCero: true });
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (tipo !== "MENSUALIDAD" && tipo !== "INSCRIPCION") return { error: "Elige a qué se aplica el descuento." };
  if (valor === null) return { error: "El descuento debe ser un número válido." };
  if (valor > 0 && motivo.length < 3) return { error: "Escribe el motivo del descuento (ej. Beca 50%, hermano)." };

  try {
    const aplicadas = await prisma.$transaction(async (tx) => {
      const ins = await tx.inscripcion.findUniqueOrThrow({ where: { id: inscripcionId } });
      const base = aCentavos(tipo === "MENSUALIDAD" ? ins.montoMensualidad : ins.montoInscripcion);
      if (valor > base) throw new ErrorNegocio(`El descuento no puede superar ${quetzales(base)}.`);
      await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: {
          ...(tipo === "MENSUALIDAD"
            ? { descuentoMensualidad: deCentavos(valor) }
            : { descuentoInscripcion: deCentavos(valor) }),
          motivoDescuento: motivo || null,
        },
      });
      const cargos = await tx.cargo.findMany({
        where: { inscripcionId, concepto: tipo, estado: { in: ["PENDIENTE", "PAGADO"] } },
      });
      let n = 0;
      for (const c of cargos) {
        if (aCentavos(c.pagado) > 0) continue;
        const desc = Math.min(valor, aCentavos(c.monto));
        const neto = aCentavos(c.monto) - desc;
        await tx.cargo.update({
          where: { id: c.id },
          data: { descuento: deCentavos(desc), estado: estadoSegunPago(neto, 0) },
        });
        n++;
      }
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "DESCUENTO", entidad: "Inscripcion", entidadId: inscripcionId,
        detalle: `${tipo}: ${quetzales(valor)} por cuota. ${motivo}`,
      });
      return n;
    });
    revalidatePath(`/admin/cobros/${inscripcionId}`);
    return { ok: `Descuento aplicado a ${aplicadas} cuota(s) sin pagos.` };
  } catch (e) {
    return aEstadoError(e);
  }
}
