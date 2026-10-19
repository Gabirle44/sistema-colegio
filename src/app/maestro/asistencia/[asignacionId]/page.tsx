import CapturaAsistencia from "@/components/asistencia/CapturaAsistencia";

export default async function Page({
  params, searchParams,
}: { params: Promise<{ asignacionId: string }>; searchParams: Promise<{ fecha?: string; vista?: string }> }) {
  const id = Number((await params).asignacionId);
  const { fecha, vista } = await searchParams;
  return <CapturaAsistencia asignacionId={id} fechaParam={fecha} vista={vista} base="/maestro/asistencia" volver="/maestro" />;
}
