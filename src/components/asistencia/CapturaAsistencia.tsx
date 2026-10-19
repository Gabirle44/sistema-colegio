import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { guardarAsistencia } from "@/lib/asistencia/actions";
import { ETIQUETA, esFechaIso, esFinDeSemana, fechaDb, nombreDia, sumarDias } from "@/lib/asistencia/utils";
import { fechaCorta, isoHoyGT, mayuscula } from "@/lib/cobros/utils";
import BotonVolver from "@/components/BotonVolver";
import AsistenciaForm, { type Est } from "./AsistenciaForm";

type Props = { asignacionId: number; fechaParam?: string; vista?: string; base: string; volver: string };

const flecha = "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50";

// Pantalla de asistencia compartida por maestro y administrador
export default async function CapturaAsistencia({ asignacionId, fechaParam, vista, base, volver }: Props) {
  const actor = await requireActor();
  const asig = await prisma.asignacionCurso.findUnique({
    where: { id: asignacionId },
    include: { curso: true, maestro: true, seccion: { include: { grado: true, ciclo: true } } },
  });
  if (!asig) notFound();
  if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) redirect("/maestro");

  const hoy = isoHoyGT();
  const fecha = esFechaIso(fechaParam) && fechaParam <= hoy ? fechaParam : hoy;
  const resumen = vista === "resumen";

  const inscripciones = await prisma.inscripcion.findMany({
    where: { seccionId: asig.seccionId, cicloId: asig.seccion.cicloId, alumno: { activo: true } },
    include: { alumno: true },
    orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
  });
  const registros = await prisma.asistencia.findMany({
    where: { asignacionId, ...(resumen ? {} : { fecha: fechaDb(fecha) }) },
  });

  const ruta = `${base}/${asignacionId}`;
  const pestana = (activa: boolean) =>
    `rounded-lg px-4 py-1.5 text-sm font-medium transition ${activa ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`;

  return (
    <div className="space-y-4">
      <BotonVolver href={volver}>Volver</BotonVolver>

      {/* Encabezado */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#15233b] text-amber-300">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M8.5 15l2 2 4-4" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Asistencia</div>
            <h1 className="truncate text-2xl font-bold leading-tight text-slate-800">{asig.curso.nombre}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">{asig.seccion.grado.nombre} {asig.seccion.nombre}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">Ciclo {asig.seccion.ciclo.anio}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{inscripciones.length} alumno(s)</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{asig.maestro.nombres} {asig.maestro.apellidos}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-2.5">
          <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            <Link href={`${ruta}?fecha=${fecha}`} className={pestana(!resumen)}>Tomar asistencia</Link>
            <Link href={`${ruta}?vista=resumen`} className={pestana(resumen)}>Resumen del ciclo</Link>
          </div>
        </div>
      </div>

      {resumen ? (
        <Resumen inscripciones={inscripciones} registros={registros} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-1.5">
              <Link href={`${ruta}?fecha=${sumarDias(fecha, -1)}`} aria-label="Día anterior" className={flecha}>
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-5 5 5 5" /></svg>
              </Link>
              {fecha < hoy ? (
                <Link href={`${ruta}?fecha=${sumarDias(fecha, 1)}`} aria-label="Día siguiente" className={flecha}>
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5l5 5-5 5" /></svg>
                </Link>
              ) : (
                <span className={`${flecha} cursor-not-allowed text-slate-300`} aria-hidden>
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5l5 5-5 5" /></svg>
                </span>
              )}
            </div>

            <div className="mr-auto">
              <div className="text-base font-semibold leading-tight text-slate-800">
                {mayuscula(nombreDia(fecha))} {fechaCorta(fechaDb(fecha))}
              </div>
              <div className="text-xs text-slate-500">
                {fecha === hoy ? "Hoy" : <Link href={ruta} className="text-blue-700 hover:underline">Volver a hoy</Link>}
              </div>
            </div>

            <form className="flex items-center gap-1.5">
              <input type="date" name="fecha" defaultValue={fecha} max={hoy} aria-label="Elegir fecha"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
              <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Ir</button>
            </form>

            <form action={`${ruta}/pdf`} method="get" target="_blank" className="flex items-center gap-1.5">
              <input type="month" name="mes" defaultValue={fecha.slice(0, 7)} aria-label="Mes de la lista"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8V3h8v5M6 15H4V8h12v7h-2M6 12h8v5H6z" />
                </svg>
                Imprimir lista
              </button>
            </form>
          </div>

          {esFinDeSemana(fecha) && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Esa fecha cae en fin de semana. Si hubo clase, puedes registrarla igual.</p>
          )}

          <AsistenciaForm
            key={fecha}
            action={guardarAsistencia.bind(null, asignacionId, fecha)}
            filas={inscripciones.map((i) => {
              const r = registros.find((x) => x.inscripcionId === i.id);
              return {
                inscripcionId: i.id, nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`, carnet: i.alumno.carnet,
                estado: (r?.estado ?? "") as Est, obs: r?.observacion ?? "",
              };
            })}
          />
        </>
      )}
    </div>
  );
}

function Resumen({
  inscripciones, registros,
}: {
  inscripciones: { id: number; alumno: { nombres: string; apellidos: string; carnet: string } }[];
  registros: { inscripcionId: number; estado: keyof typeof ETIQUETA; fecha: Date }[];
}) {
  const dias = new Set(registros.map((r) => r.fecha.toISOString().slice(0, 10))).size;
  const filas = inscripciones.map((i) => {
    const mios = registros.filter((r) => r.inscripcionId === i.id);
    const c = (e: keyof typeof ETIQUETA) => mios.filter((r) => r.estado === e).length;
    const asistio = c("PRESENTE") + c("TARDE");
    return { i, p: c("PRESENTE"), t: c("TARDE"), e: c("EXCUSA"), a: c("AUSENTE"), pct: mios.length ? Math.round((asistio / mios.length) * 100) : null };
  });
  const conDato = filas.filter((f) => f.pct !== null);
  const promedio = conDato.length ? Math.round(conDato.reduce((s, f) => s + (f.pct ?? 0), 0) / conDato.length) : null;
  const enRiesgo = conDato.filter((f) => (f.pct ?? 100) < 80).length;
  const th = "px-3 py-3 text-right font-medium";

  if (dias === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="text-sm font-medium text-slate-700">Todavía no hay asistencia registrada</div>
        <div className="mt-1 text-xs text-slate-500">Toma la asistencia de un día para ver el resumen aquí.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ["Días registrados", String(dias), "text-slate-800"],
          ["Asistencia promedio", promedio === null ? "—" : `${promedio}%`, promedio !== null && promedio < 80 ? "text-red-600" : "text-green-700"],
          ["Alumnos bajo 80%", String(enRiesgo), enRiesgo > 0 ? "text-red-600" : "text-slate-800"],
        ].map(([t, v, c]) => (
          <div key={t} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{t}</div>
            <div className={`text-2xl font-bold tabular-nums ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left font-medium">Alumno</th>
              <th className={th}>Presente</th><th className={th}>Tarde</th><th className={th}>Excusa</th><th className={th}>Ausente</th>
              <th className="px-3 py-3 text-left font-medium">% asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map(({ i, p, t, e, a, pct }) => (
              <tr key={i.id}>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-slate-800">{i.alumno.apellidos}, {i.alumno.nombres}</div>
                  <div className="text-xs text-slate-500">{i.alumno.carnet}</div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{p || "—"}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${t > 0 ? "text-amber-700" : "text-slate-300"}`}>{t || "—"}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${e > 0 ? "text-sky-700" : "text-slate-300"}`}>{e || "—"}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${a > 0 ? "font-semibold text-red-600" : "text-slate-300"}`}>{a || "—"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex min-w-28 items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${pct === null ? "" : pct < 80 ? "bg-red-500" : "bg-green-600"}`} style={{ width: `${pct ?? 0}%` }} />
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${pct === null ? "text-slate-300" : pct < 80 ? "text-red-600" : "text-green-700"}`}>
                      {pct === null ? "—" : `${pct}%`}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">El porcentaje cuenta presente y tarde sobre los días registrados de este curso.</p>
    </div>
  );
}
