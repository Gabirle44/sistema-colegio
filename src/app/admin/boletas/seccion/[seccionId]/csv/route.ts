import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cargarBoletas } from "@/lib/notas/boleta";
import { etiquetaResultado } from "@/lib/notas/calculo";
import { csvFila } from "@/lib/cobros/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ seccionId: string }> }) {
  await requireAdmin();
  const seccionId = Number((await params).seccionId);
  if (!Number.isInteger(seccionId)) notFound();
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId }, include: { grado: true } });
  if (!seccion) notFound();
  const ins = await prisma.inscripcion.findMany({
    where: { seccionId, cicloId: seccion.cicloId, alumno: { activo: true } },
    orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
    select: { id: true },
  });
  const { boletas } = await cargarBoletas(ins.map((i) => i.id));
  const cursos = boletas[0]?.cursos.map((c) => c.nombre) ?? [];
  const periodos = boletas[0]?.periodos.map((p) => p.nombre) ?? [];
  const filas: unknown[][] = [["Carnet", "Alumno", ...cursos.flatMap((c) => [...periodos.map((p) => `${c} - ${p}`), `${c} - Promedio`]), "Promedio general", "Resultado", "Inasistencias"]];
  for (const b of boletas) {
    filas.push([
      b.alumno.carnet, b.alumno.nombre,
      ...b.cursos.flatMap((c) => [...c.notas.map((n) => n ?? ""), c.promedio ?? ""]),
      b.promedioGeneral ?? "", etiquetaResultado[b.resultado], b.totalInasistencias,
    ]);
  }
  const csv = "﻿" + filas.map(csvFila).join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cuadro-notas-${seccion.id}.csv"` },
  });
}
