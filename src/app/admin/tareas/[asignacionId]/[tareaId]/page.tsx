import CapturaEntregas from "@/components/tareas/CapturaEntregas";

export default async function Page({
  params,
}: { params: Promise<{ asignacionId: string; tareaId: string }> }) {
  const { asignacionId, tareaId } = await params;
  return (
    <CapturaEntregas
      asignacionId={Number(asignacionId)}
      tareaId={Number(tareaId)}
      volver={`/admin/tareas/${asignacionId}`}
    />
  );
}