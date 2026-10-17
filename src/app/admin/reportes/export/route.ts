import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { resumenCuenta } from "@/lib/cobros/cargos";
import { obtenerMorosos } from "@/lib/cobros/morosos";
import { aCentavos, csvFila, deCentavos, fechaCorta, fechaHoraGT, inicioDiaGT, mesGT, numeroRecibo } from "@/lib/cobros/utils";

const q = (c: number) => deCentavos(c);

export async function GET(req: Request) {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const tipo = sp.get("tipo") ?? "";
  const filas: unknown[][] = [];
  let nombre = tipo;

  if (tipo === "morosos") {
    const { morosos } = await obtenerMorosos({
      gradoId: Number(sp.get("grado")) || undefined,
      minCuotas: Number(sp.get("min")) || 1,
    });
    filas.push(["Carnet", "Alumno", "Grado", "Sección", "Cuotas vencidas", "Deuda vencida (Q)", "Vencido desde", "Encargado", "Teléfono", "Correo"]);
    for (const m of morosos) {
      filas.push([m.carnet, m.alumno, m.grado, m.seccion, m.cuotasVencidas, q(m.deudaVencida), fechaCorta(m.masAntiguo), m.encargado, m.telefono ?? "", m.correo ?? ""]);
    }
  } else if (tipo === "recibos") {
    const d = sp.get("desde"), h = sp.get("hasta");
    const okFecha = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const recibos = await prisma.recibo.findMany({
      where: {
        ...(okFecha(d) ? { fecha: { gte: inicioDiaGT(d), ...(okFecha(h) ? { lt: new Date(inicioDiaGT(h).getTime() + 86_400_000) } : {}) } } : {}),
      },
      include: { emitidoPor: true, inscripcion: { include: { alumno: true } } },
      orderBy: { id: "asc" },
    });
    filas.push(["Recibo", "Fecha", "Carnet", "Alumno", "Método", "Referencia", "Total (Q)", "Estado", "Cajero"]);
    for (const r of recibos) {
      const a = r.inscripcion.alumno;
      filas.push([numeroRecibo(r), fechaHoraGT(r.fecha), a.carnet, `${a.apellidos}, ${a.nombres}`, r.metodo, r.referencia ?? "", q(aCentavos(r.total)), r.estado, r.emitidoPor.nombre]);
    }
  } else if (tipo === "ingresos") {
    const recibos = await prisma.recibo.findMany({ where: { estado: "VIGENTE" }, orderBy: { fecha: "asc" } });
    const mapa = new Map<string, number>();
    for (const r of recibos) {
      const k = `${mesGT(r.fecha)}|${r.metodo}`;
      mapa.set(k, (mapa.get(k) ?? 0) + aCentavos(r.total));
    }
    filas.push(["Mes", "Método", "Total (Q)"]);
    for (const [k, v] of mapa) filas.push([...k.split("|"), q(v)]);
  } else if (tipo === "saldos") {
    const cfg = await obtenerConfig();
    const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
    const ins = ciclo
      ? await prisma.inscripcion.findMany({
          where: { cicloId: ciclo.id },
          include: { alumno: true, seccion: { include: { grado: true } }, cargos: true },
          orderBy: { alumno: { apellidos: "asc" } },
        })
      : [];
    filas.push(["Carnet", "Alumno", "Grado", "Sección", "Total (Q)", "Pagado (Q)", "Saldo (Q)", "Vencido (Q)"]);
    for (const i of ins) {
      const r = resumenCuenta(i.cargos, cfg.diasGracia);
      filas.push([i.alumno.carnet, `${i.alumno.apellidos}, ${i.alumno.nombres}`, i.seccion.grado.nombre, i.seccion.nombre, q(r.cargado - r.descuentos), q(r.pagado), q(r.saldo), q(r.vencido)]);
    }
  } else {
    return new Response("Tipo de reporte no válido", { status: 400 });
  }

  nombre = `${nombre}-${new Date().toISOString().slice(0, 10)}`;
  const csv = "﻿" + filas.map(csvFila).join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre}.csv"` },
  });
}
