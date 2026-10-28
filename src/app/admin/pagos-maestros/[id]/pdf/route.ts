import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { aCentavos } from "@/lib/cobros/utils";
import { pdfComprobanteMaestro } from "@/lib/maestros/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const p = await prisma.pagoMaestro.findUnique({
    where: { id },
    include: { maestro: true, registradoPor: true },
  });
  if (!p) notFound();
  const cfg = await obtenerConfig();
  const bytes = await pdfComprobanteMaestro({
    colegio: { nombre: cfg.nombreColegio, direccion: cfg.direccion, telefono: cfg.telefono },
    numero: p.id,
    maestro: `${p.maestro.nombres} ${p.maestro.apellidos}`,
    mes: p.mes,
    anio: p.anio,
    monto: aCentavos(p.monto),
    sueldoBase: aCentavos(p.sueldoBase) > 0 ? aCentavos(p.sueldoBase) : aCentavos(p.monto),
    bonificacion: aCentavos(p.bonificacion),
    horasExtra: aCentavos(p.horasExtra),
    igss: aCentavos(p.igss),
    descuentos: aCentavos(p.descuentos),
    fecha: p.fecha,
    observaciones: p.observaciones,
    registradoPor: p.registradoPor.nombre,
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pago-maestro-${p.id}.pdf"`,
    },
  });
}
