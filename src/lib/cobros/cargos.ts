import type { Prisma } from "@prisma/client";
import { aCentavos, deCentavos, esVencido, nombreMes, mayuscula } from "./utils";

export type CargoMontos = { monto: unknown; descuento: unknown; pagado: unknown };

export const netoCentavos = (c: CargoMontos) => aCentavos(c.monto) - aCentavos(c.descuento);
export const saldoCentavos = (c: CargoMontos) => netoCentavos(c) - aCentavos(c.pagado);

export function estadoSegunPago(neto: number, pagado: number): "PENDIENTE" | "PARCIAL" | "PAGADO" {
  if (neto <= 0 || pagado >= neto) return "PAGADO";
  if (pagado <= 0) return "PENDIENTE";
  return "PARCIAL";
}

export type ResumenCuenta = {
  cargado: number;
  descuentos: number;
  pagado: number;
  saldo: number;
  vencido: number;
  cuotasVencidas: number;
};

export function resumenCuenta(
  cargos: (CargoMontos & { estado: string; fechaVencimiento: Date })[],
  diasGracia: number,
): ResumenCuenta {
  const r: ResumenCuenta = { cargado: 0, descuentos: 0, pagado: 0, saldo: 0, vencido: 0, cuotasVencidas: 0 };
  for (const c of cargos) {
    if (c.estado === "ANULADO") continue;
    r.cargado += aCentavos(c.monto);
    r.descuentos += aCentavos(c.descuento);
    r.pagado += aCentavos(c.pagado);
    const saldo = Math.max(0, saldoCentavos(c));
    r.saldo += saldo;
    if (saldo > 0 && esVencido(c.fechaVencimiento, diasGracia)) {
      r.vencido += saldo;
      r.cuotasVencidas += 1;
    }
  }
  return r;
}

type DatosInscripcion = {
  id: number;
  montoInscripcion: unknown;
  montoMensualidad: unknown;
  descuentoInscripcion: unknown;
  descuentoMensualidad: unknown;
};

// Crea el cargo de inscripción y todas las mensualidades del ciclo.
export async function generarCargos(
  tx: Prisma.TransactionClient,
  ins: DatosInscripcion,
  anio: number,
  cfg: { cantidadMensualidades: number; mesInicio: number; diaVencimiento: number },
  hoy: Date,
) {
  const datos: Prisma.CargoCreateManyInput[] = [];

  const montoIns = aCentavos(ins.montoInscripcion);
  if (montoIns > 0) {
    const desc = Math.min(aCentavos(ins.descuentoInscripcion), montoIns);
    datos.push({
      inscripcionId: ins.id,
      concepto: "INSCRIPCION",
      descripcion: `Inscripción ${anio}`,
      monto: deCentavos(montoIns),
      descuento: deCentavos(desc),
      fechaVencimiento: hoy,
      estado: montoIns - desc <= 0 ? "PAGADO" : "PENDIENTE",
    });
  }

  const montoMes = aCentavos(ins.montoMensualidad);
  const descMes = Math.min(aCentavos(ins.descuentoMensualidad), montoMes);
  for (let i = 0; i < cfg.cantidadMensualidades; i++) {
    const desplazamiento = cfg.mesInicio - 1 + i;
    const mes = (desplazamiento % 12) + 1;
    const año = anio + Math.floor(desplazamiento / 12);
    datos.push({
      inscripcionId: ins.id,
      concepto: "MENSUALIDAD",
      descripcion: `Mensualidad ${mayuscula(nombreMes(mes))} ${año}`,
      mes,
      monto: deCentavos(montoMes),
      descuento: deCentavos(descMes),
      fechaVencimiento: new Date(Date.UTC(año, mes - 1, cfg.diaVencimiento)),
      estado: montoMes - descMes <= 0 ? "PAGADO" : "PENDIENTE",
    });
  }

  await tx.cargo.createMany({ data: datos });
}
