import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { resumenCuenta } from "@/lib/cobros/cargos";
import { pdfSolvencia } from "@/lib/cobros/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ inscripcionId: string }> }) {
  await requireAdmin();
  const id = Number((await params).inscripcionId);
  if (!Number.isInteger(id)) notFound();
  const ins = await prisma.inscripcion.findUnique({
    where: { id },
    include: { alumno: true, ciclo: true, seccion: { include: { grado: true } }, cargos: true },
  });
  if (!ins) notFound();
  const cfg = await obtenerConfig();
  const r = resumenCuenta(ins.cargos, cfg.diasGracia);
  const bytes = await pdfSolvencia({
    colegio: { nombre: cfg.nombreColegio, direccion: cfg.direccion, telefono: cfg.telefono },
    alumno: {
      nombre: `${ins.alumno.nombres} ${ins.alumno.apellidos}`, carnet: ins.alumno.carnet,
      grado: ins.seccion.grado.nombre, seccion: ins.seccion.nombre,
    },
    ciclo: ins.ciclo.anio, fecha: new Date(), solvente: r.saldo === 0, saldo: r.saldo,
    cuotasPendientes: ins.cargos.filter((c) => c.estado === "PENDIENTE" || c.estado === "PARCIAL").length,
  });
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="solvencia-${ins.alumno.carnet}.pdf"` },
  });
}
