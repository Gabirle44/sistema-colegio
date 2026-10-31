import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { obtenerDatosHorariosAdmin } from "@/lib/horarios/consultas";
import RejillaHorario from "@/components/horarios/RejillaHorario";
import FormBloqueHorario from "@/components/horarios/FormBloqueHorario";

type SearchParams = Promise<{ seccionId?: string }>;

export default async function AdminHorariosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const { seccionId } = await searchParams;
  const idNumerico = seccionId ? Number(seccionId) : undefined;

  const {
    ciclo,
    secciones,
    seccionSeleccionada,
    asignaciones,
    bloques,
  } = await obtenerDatosHorariosAdmin(idNumerico);

  if (!ciclo) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-bold">No hay un ciclo escolar activo</h2>
        <p className="mt-1 text-sm text-amber-800">
          Activa un ciclo escolar en la configuración para poder crear y visualizar horarios de clases.
        </p>
      </div>
    );
  }

  if (secciones.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Horarios de Clases</h1>
          <p className="mt-1 text-sm text-slate-500">Ciclo Escolar {ciclo.anio}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
          <p className="text-slate-600 text-sm">
            No hay secciones registradas para el ciclo {ciclo.anio}.
          </p>
          <Link
            href="/admin/academico"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Ir a Académico y crear secciones
          </Link>
        </div>
      </div>
    );
  }

  const nombreSecCompleto = seccionSeleccionada
    ? `${seccionSeleccionada.grado.nombre} "${seccionSeleccionada.nombre}"`
    : "";

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Horarios de Clases</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Ciclo {ciclo.anio}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Organiza los bloques semanales por sección con validación automática contra cruce de horarios.
          </p>
        </div>

        <Link
          href="/admin/academico"
          className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-xs transition"
        >
          <span>Gestión de cursos y maestros</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Selector de Sección */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Seleccionar Sección:
        </label>
        <div className="flex flex-wrap gap-2">
          {secciones.map((sec) => {
            const activo = seccionSeleccionada?.id === sec.id;
            return (
              <Link
                key={sec.id}
                href={`/admin/horarios?seccionId=${sec.id}`}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activo
                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{sec.grado.nombre}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                    activo ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {sec.nombre}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Contenido de la sección seleccionada */}
      {seccionSeleccionada && (
        <div className="space-y-6">
          {/* Tarjeta resumen de la sección */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Horario: {nombreSecCompleto}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {asignaciones.length} materia(s) asignadas con docente en esta sección
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-center">
                <span className="block text-xs font-medium text-blue-600">Total bloques</span>
                <span className="text-base font-bold text-blue-900">{bloques.length}</span>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-center">
                <span className="block text-xs font-medium text-emerald-600">Cursos</span>
                <span className="text-base font-bold text-emerald-900">{asignaciones.length}</span>
              </div>
            </div>
          </div>

          {/* Formulario para agregar nuevo bloque */}
          <FormBloqueHorario
            asignaciones={asignaciones.map((a) => ({
              id: a.id,
              curso: { id: a.curso.id, nombre: a.curso.nombre },
              maestro: { id: a.maestro.id, nombres: a.maestro.nombres, apellidos: a.maestro.apellidos },
            }))}
            seccionNombre={nombreSecCompleto}
          />

          {/* Rejilla de horario semanal */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Distribución Semanal
            </h3>
            <RejillaHorario bloques={bloques} modo="admin" />
          </div>
        </div>
      )}
    </div>
  );
}
