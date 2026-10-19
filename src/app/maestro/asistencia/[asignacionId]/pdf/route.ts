import { respuestaListaAsistencia } from "@/lib/asistencia/pdfRespuesta";

export async function GET(req: Request, { params }: { params: Promise<{ asignacionId: string }> }) {
  const id = Number((await params).asignacionId);
  return respuestaListaAsistencia(id, new URL(req.url).searchParams.get("mes"));
}
