import { requireActor } from "@/lib/notas/acceso";
import { obtenerHorarioMaestro } from "@/lib/horarios/consultas";
import RejillaHorario from "@/components/horarios/RejillaHorario";
import Link from "next/link";

export default async function MaestroHorarioPage() {
  const actor = await requireActor();
  if (actor.rol !== "MAESTRO" || !actor.maestroId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        Esta sección es exclusiva para docentes.
      </div>
    );
  }

  const { ciclo, maestro, bloques } = await obtenerHorarioMaestro(actor.maestroId);

  if (!ciclo) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-bold">No hay un ciclo escolar activo</h2>
        <p className="mt-1 text-sm text-amber-800">
          El administrador debe activar un ciclo escolar para ver los horarios.
        </p>
      </div>
    );
  }

  // Secciones únicas donde da clases
  const seccionesUnicas = Array.from(
    new Set(bloques.map((b) => `${b.seccion.grado.nombre} "${b.seccion.nombre}"`)),
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Horario Semanal</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Ciclo {ciclo.anio}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Consulta tus periodos y materias programadas de lunes a viernes.
          </p>
        </div>

        <Link
          href="/maestro"
          className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-xs transition"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Regresar a mis cursos</span>
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Docente</span>
          <p className="text-base font-bold text-slate-900 truncate">
            {maestro?.nombres} {maestro?.apellidos}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Clases a la semana</span>
          <p className="text-xl font-extrabold text-blue-600">{bloques.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Secciones atendidas</span>
          <p className="text-xl font-extrabold text-emerald-600">{seccionesUnicas.length}</p>
        </div>
      </div>

      {/* Rejilla */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Calendario de Clases
        </h2>
        <RejillaHorario bloques={bloques} modo="maestro" />
      </div>
    </div>
  );
}
