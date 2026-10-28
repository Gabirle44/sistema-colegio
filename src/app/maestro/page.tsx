import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";

export default async function MaestroPage() {
  const actor = await requireActor();
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  const usuario = await prisma.usuario.findUnique({ where: { id: actor.usuarioId } });
  const periodo = ciclo ? await prisma.periodo.findFirst({ where: { cicloId: ciclo.id, abierto: true }, orderBy: { numero: "asc" } }) : null;

  const asignaciones = ciclo && actor.maestroId
    ? await prisma.asignacionCurso.findMany({
        where: { maestroId: actor.maestroId, seccion: { cicloId: ciclo.id } },
        include: { curso: true, seccion: { include: { grado: true } } },
        orderBy: [{ seccion: { grado: { orden: "asc" } } }, { curso: { nombre: "asc" } }],
      })
    : [];
  const [alumnos, notas] = ciclo
    ? await Promise.all([
        prisma.inscripcion.groupBy({ by: ["seccionId"], where: { cicloId: ciclo.id, alumno: { activo: true } }, _count: { _all: true } }),
        periodo
          ? prisma.nota.findMany({ where: { periodoId: periodo.id, cursoId: { in: asignaciones.map((a) => a.cursoId) } }, select: { cursoId: true, inscripcion: { select: { seccionId: true } } } })
          : Promise.resolve([]),
      ])
    : [[], []];
  const alumnosPor = new Map(alumnos.map((a) => [a.seccionId, a._count._all]));
  const hechas = new Map<string, number>();
  for (const n of notas) hechas.set(`${n.inscripcion.seccionId}|${n.cursoId}`, (hechas.get(`${n.inscripcion.seccionId}|${n.cursoId}`) ?? 0) + 1);

  const primer = usuario?.nombre.split(/\s+/)[0] ?? "";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hola, {primer}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {periodo ? <>Estás capturando notas del <b className="text-slate-700">{periodo.nombre}</b>.</> : "No hay un periodo abierto: puedes consultar tus notas, pero no cambiarlas."}
          {periodo && " Puedes escribirlas en pantalla o subirlas desde un archivo."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {asignaciones.map((a) => {
          const total = alumnosPor.get(a.seccionId) ?? 0;
          const h = hechas.get(`${a.seccionId}|${a.cursoId}`) ?? 0;
          const pct = total ? Math.round((h / total) * 100) : 0;
          const completo = total > 0 && h >= total;
          return (
            <Link key={a.id} href={`/maestro/notas/${a.id}`} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-600">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{a.curso.nombre} </div>
                  <div className="text-sm text-slate-500">{a.seccion.grado.nombre} {a.seccion.nombre} · {total} {total === 1 ? "alumno" : "alumnos"}</div>
                </div>
                {periodo && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${completo ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {completo ? "Completo" : "Pendiente"}
                  </span>
                )}
              </div>
              {periodo && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Notas ingresadas</span><span className="tabular-nums">{h} de {total}</span></div>
                  <div className="h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${completo ? "bg-green-600" : "bg-blue-600"}`} style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} /></div>
                </div>
              )}
              <div className="mt-4 text-sm font-medium text-blue-700 group-hover:underline">Ingresar notas</div>
            </Link>
          );
        })}
        {asignaciones.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 sm:col-span-2">
            Todavía no tienes cursos asignados en este ciclo. Pide a la administración que te los asigne.
          </p>
        )}
      </div>

      {asignaciones.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Asistencia</div>
          <p className="mt-0.5 text-xs text-slate-500">Toma la asistencia de hoy o imprime la lista del mes.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {asignaciones.map((a) => (
              <Link key={a.id} href={`/maestro/asistencia/${a.id}`}
                className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm text-slate-700 hover:border-blue-600 hover:text-blue-700">
                {a.curso.nombre} · {a.seccion.grado.nombre} {a.seccion.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* BLOQUE NUEVO DE TAREAS */}
      {asignaciones.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Tareas y Entregas</div>
          <p className="mt-0.5 text-xs text-slate-500">Publica nuevas tareas o califica las entregas de tus alumnos.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {asignaciones.map((a) => (
              <Link key={a.id} href={`/maestro/tareas/${a.id}`}
                className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm text-slate-700 hover:border-emerald-600 hover:text-emerald-700">
                {a.curso.nombre} · {a.seccion.grado.nombre} {a.seccion.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}