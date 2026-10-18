import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { guardarAsistencia } from "@/lib/asistencia/actions";
import { ETIQUETA, esFechaIso, esFinDeSemana, fechaDb, nombreDia, sumarDias } from "@/lib/asistencia/utils";
import { fechaCorta, isoHoyGT } from "@/lib/cobros/utils";
import BotonVolver from "@/components/BotonVolver";
import AsistenciaForm, { type Est } from "./AsistenciaForm";

type Props = { asignacionId: number; fechaParam?: string; vista?: string; base: string; volver: string };

const pestana = (activa: boolean) =>
  `rounded-full border px-4 py-1.5 text-sm ${activa ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`;

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
  return (
    <div className="space-y-4">
      <div>
        <BotonVolver href={volver}>Volver</BotonVolver>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Asistencia · {asig.curso.nombre}</h1>
        <p className="text-sm text-slate-500">
          {asig.seccion.grado.nombre} {asig.seccion.nombre} · Ciclo {asig.seccion.ciclo.anio} · Maestro: {asig.maestro.nombres} {asig.maestro.apellidos} · {inscripciones.length} alumno(s)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`${ruta}?fecha=${fecha}`} className={pestana(!resumen)}>Tomar asistencia</Link>
        <Link href={`${ruta}?vista=resumen`} className={pestana(resumen)}>Resumen del ciclo</Link>
      </div>

      {resumen ? (
        <Resumen inscripciones={inscripciones} registros={registros} />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-1.5">
              <Link href={`${ruta}?fecha=${sumarDias(fecha, -1)}`} aria-label="Día anterior"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">←</Link>
              <form className="flex items-center gap-1.5">
                <input type="date" name="fecha" defaultValue={fecha} max={hoy}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
                <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Ir</button>
              </form>
              {fecha < hoy ? (
                <Link href={`${ruta}?fecha=${sumarDias(fecha, 1)}`} aria-label="Día siguiente"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">→</Link>
              ) : (
                <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-300">→</span>
              )}
              {fecha !== hoy && <Link href={ruta} className="ml-1 text-sm text-blue-700 hover:underline">Hoy</Link>}
            </div>
            <div className="text-sm text-slate-600">
              <b className="capitalize text-slate-800">{nombreDia(fecha)}</b> {fechaCorta(fechaDb(fecha))}
            </div>
            <form action={`${ruta}/pdf`} method="get" target="_blank" className="ml-auto flex items-center gap-1.5">
              <input type="month" name="mes" defaultValue={fecha.slice(0, 7)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" aria-label="Mes de la lista" />
              <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">Lista para imprimir (PDF)</button>
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
  const th = "px-3 py-3 text-right font-medium";
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">{dias} día(s) con asistencia registrada en este curso. El porcentaje cuenta presente y tarde.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left font-medium">Alumno</th>
              <th className={th}>Presente</th><th className={th}>Tarde</th><th className={th}>Excusa</th><th className={th}>Ausente</th><th className={th}>% asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map(({ i, p, t, e, a, pct }) => (
              <tr key={i.id}>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-slate-800">{i.alumno.apellidos}, {i.alumno.nombres}</div>
                  <div className="text-xs text-slate-500">{i.alumno.carnet}</div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{p}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{t}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{e}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${a > 0 ? "font-medium text-red-600" : ""}`}>{a}</td>
                <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${pct === null ? "text-slate-300" : pct < 80 ? "text-red-600" : "text-green-700"}`}>
                  {pct === null ? "—" : `${pct}%`}
                </td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay alumnos inscritos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
