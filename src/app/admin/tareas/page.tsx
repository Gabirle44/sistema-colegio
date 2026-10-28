import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BotonVolver from "@/components/BotonVolver";

export default async function TareasAdminPage() {
  // Obtenemos el ciclo activo para listar solo los cursos/secciones vigentes
  const cicloActivo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });

  const asignaciones = await prisma.asignacionCurso.findMany({
    where: cicloActivo ? { seccion: { cicloId: cicloActivo.id } } : {},
    include: {
      curso: true,
      maestro: true,
      seccion: { include: { grado: true } },
      _count: { select: { tareas: true } },
    },
    orderBy: [
      { seccion: { grado: { orden: "asc" } } },
      { seccion: { nombre: "asc" } },
      { curso: { nombre: "asc" } },
    ],
  });

  return (
    <div className="space-y-4">
      <BotonVolver href="/admin">Volver al inicio</BotonVolver>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Módulo de Tareas</div>
        <h1 className="text-2xl font-bold leading-tight text-slate-800">Selecciona un Curso y Sección</h1>
        <p className="text-sm text-slate-500 mt-1">
          Elige una asignación académica para gestionar o revisar sus tareas y entregas.
        </p>
      </div>

      {asignaciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay cursos asignados en el ciclo escolar activo.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {asignaciones.map((asig) => (
            <Link
              key={asig.id}
              href={`/admin/tareas/${asig.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition"
            >
              <div className="text-xs font-semibold text-blue-700">
                {asig.seccion.grado.nombre} - Sección {asig.seccion.nombre}
              </div>
              <h2 className="text-base font-bold text-slate-800 mt-1">{asig.curso.nombre}</h2>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                <span>Maestro: {asig.maestro.nombres} {asig.maestro.apellidos}</span>
                <span className="font-medium text-slate-700">{asig._count.tareas} tarea(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}