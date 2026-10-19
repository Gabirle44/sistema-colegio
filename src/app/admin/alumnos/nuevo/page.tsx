import { requireAdmin } from "@/lib/auth";
import AlumnoForm from "../AlumnoForm";
import { crearAlumno } from "../actions";

export default async function NuevoAlumnoPage() {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Nuevo alumno</h1>
      <AlumnoForm action={crearAlumno} etiquetaBoton="Guardar alumno" />
    </div>
  );
}
