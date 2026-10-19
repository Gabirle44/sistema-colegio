import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { cargarBoletas, estaRetenida } from "@/lib/notas/boleta";
import { pdfBoletas } from "@/lib/notas/pdf";
import { quetzales } from "@/lib/cobros/utils";

export async function GET(req: Request, { params }: { params: Promise<{ inscripcionId: string }> }) {
  const sesion = await requireAdmin();
  void sesion;
  const id = Number((await params).inscripcionId);
  if (!Number.isInteger(id)) notFound();
  const { boletas, ajustes } = await cargarBoletas([id]);
  const bo = boletas[0];
  if (!bo) notFound();

  const autorizado = new URL(req.url).searchParams.get("autorizar") === "1";
  if (estaRetenida(bo, ajustes) && !autorizado) {
    const html = `<!doctype html><meta charset="utf-8"><title>Boleta retenida</title>
<body style="font-family:system-ui;max-width:520px;margin:60px auto;padding:0 16px;color:#1e293b">
<h2>Boleta retenida por saldo vencido</h2>
<p>${bo.alumno.nombre} tiene <b>${bo.cuotasVencidas}</b> cuota(s) vencida(s) por <b>${quetzales(bo.saldoVencido)}</b>.</p>
<p><a href="/admin/cobros/${id}">Ir al estado de cuenta</a> &nbsp;|&nbsp; <a href="?autorizar=1">Autorizar entrega de todos modos</a></p></body>`;
    return new Response(html, { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const bytes = await pdfBoletas([bo], ajustes);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="boleta-${bo.alumno.carnet}.pdf"` },
  });
}
