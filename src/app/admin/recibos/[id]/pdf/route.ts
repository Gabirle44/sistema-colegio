import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { pdfRecibo } from "@/lib/cobros/pdf";
import { aCentavos, numeroRecibo } from "@/lib/cobros/utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const r = await prisma.recibo.findUnique({
    where: { id },
    include: {
      emitidoPor: true,
      detalles: { include: { cargo: true }, orderBy: { id: "asc" } },
      inscripcion: { include: { alumno: true, seccion: { include: { grado: true } } } },
    },
  });
  if (!r) notFound();
  const cfg = await obtenerConfig();
  const a = r.inscripcion.alumno;
  const bytes = await pdfRecibo({
    colegio: { nombre: cfg.nombreColegio, direccion: cfg.direccion, telefono: cfg.telefono },
    recibo: {
      serie: r.serie, numero: r.numero, fecha: r.fecha, metodo: r.metodo, referencia: r.referencia,
      observaciones: r.observaciones, anulado: r.estado === "ANULADO", motivoAnulacion: r.motivoAnulacion,
      emitidoPor: r.emitidoPor.nombre, total: aCentavos(r.total),
    },
    alumno: {
      nombre: `${a.nombres} ${a.apellidos}`, carnet: a.carnet, grado: r.inscripcion.seccion.grado.nombre,
      seccion: r.inscripcion.seccion.nombre, encargado: a.encargadoNombre,
    },
    lineas: r.detalles.map((d) => ({ descripcion: d.cargo.descripcion, monto: aCentavos(d.monto) })),
  });
  const descargar = new URL(req.url).searchParams.has("descargar");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="recibo-${numeroRecibo(r)}.pdf"`,
    },
  });
}
