import CapturaNotas from "@/components/notas/CapturaNotas";

export default async function Page({
  params, searchParams,
}: { params: Promise<{ asignacionId: string }>; searchParams: Promise<{ periodo?: string }> }) {
  const id = Number((await params).asignacionId);
  const { periodo } = await searchParams;
  return <CapturaNotas asignacionId={id} periodoParam={periodo} base="/maestro/notas" volver="/maestro" />;
}
