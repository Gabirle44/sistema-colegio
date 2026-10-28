import { respuestaCuadroNotasPdf } from "@/lib/notas/cuadroRespuesta";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ asignacionId: string }> },
) {
  const asignacionId = Number((await params).asignacionId);
  return respuestaCuadroNotasPdf(asignacionId);
}

