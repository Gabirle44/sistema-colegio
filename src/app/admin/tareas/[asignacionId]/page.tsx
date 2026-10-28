import ListaTareas from "@/components/tareas/ListaTareas";

export default async function Page({
  params,
}: { params: Promise<{ asignacionId: string }> }) {
  const id = Number((await params).asignacionId);
  return <ListaTareas asignacionId={id} base="/admin/tareas" volver="/admin/tareas" />;
}