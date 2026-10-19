import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cargarBoletas, estaRetenida } from "@/lib/notas/boleta";
import { pdfBoletas } from "@/lib/notas/pdf";

export async function GET(req: Request, { params }: { params: Promise<{ seccionId: string }> }) {
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
  const { boletas, ajustes } = await cargarBoletas(ins.map((i) => i.id));
  const incluirMorosos = new URL(req.url).searchParams.get("incluirMorosos") === "1";
  const lista = incluirMorosos ? boletas : boletas.filter((b) => !estaRetenida(b, ajustes));
  const bytes = await pdfBoletas(lista, ajustes);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="boletas-${seccion.grado.nombre}-${seccion.nombre}.pdf"`.replace(/[^\x20-\x7E]/g, ""),
    },
  });
}
