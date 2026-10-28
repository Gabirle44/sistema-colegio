import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import BotonVolver from "@/components/BotonVolver";

export default async function TareasMaestroPage() {
  const actor = await requireActor();
  if (actor.rol !== "MAESTRO" || !actor.maestroId) redirect("/admin");

  const cicloActivo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });

  const misAsignaciones = await prisma.asignacionCurso.findMany({
    where: {
      maestroId: actor.maestroId,
      ...(cicloActivo ? { seccion: { cicloId: cicloActivo.id } } : {}),
    },
    include: {
      curso: true,
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
      <BotonVolver href="/maestro">Volver al panel</BotonVolver>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Mis Cursos</div>
        <h1 className="text-2xl font-bold leading-tight text-slate-800">Tareas y Entregas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Selecciona un curso asignado para publicar o calificar tareas.
        </p>
      </div>

      {misAsignaciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No tienes cursos asignados para el ciclo escolar activo.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {misAsignaciones.map((asig) => (
            <Link
              key={asig.id}
              href={`/maestro/tareas/${asig.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition"
            >
              <div className="text-xs font-semibold text-blue-700">
                {asig.seccion.grado.nombre} - Sección {asig.seccion.nombre}
              </div>
              <h2 className="text-base font-bold text-slate-800 mt-1">{asig.curso.nombre}</h2>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                <span>Tareas publicadas</span>
                <span className="font-medium text-slate-700">{asig._count.tareas}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}