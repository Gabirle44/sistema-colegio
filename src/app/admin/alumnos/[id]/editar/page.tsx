import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AlumnoForm from "../../AlumnoForm";
import { actualizarAlumno } from "../../actions";

export default async function EditarAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const alumnoId = Number.parseInt(id, 10);
  if (!Number.isInteger(alumnoId)) notFound();

  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId } });
  if (!alumno) notFound();
  const foto = await prisma.alumnoFoto.findUnique({ where: { alumnoId }, select: { alumnoId: true } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Editar alumno</h1>
      <AlumnoForm
        action={actualizarAlumno.bind(null, alumno.id)}
        etiquetaBoton="Guardar cambios"
        alumnoId={alumno.id}
        tieneFoto={foto !== null}
        valores={{
          carnet: alumno.carnet,
          cui: alumno.cui ?? "",
          nombres: alumno.nombres,
          apellidos: alumno.apellidos,
          fechaNacimiento: alumno.fechaNacimiento?.toISOString().slice(0, 10),
          telefono: alumno.telefono ?? "",
          encargadoNombre: alumno.encargadoNombre,
          encargadoTelefono: alumno.encargadoTelefono ?? "",
          encargadoCorreo: alumno.encargadoCorreo ?? "",
        }}
      />
    </div>
  );
}
