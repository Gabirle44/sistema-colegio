import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { fmtNota, num, promedio } from "@/lib/notas/calculo";
import { guardarNotas } from "@/lib/notas/actions";
import NotasForm from "./NotasForm";
import NotasActividades from "./NotasActividades";
import ActividadesForm from "./ActividadesForm";
import { guardarActividades, guardarNotasActividades } from "@/lib/notas/actividades";
import BotonVolver from "@/components/BotonVolver";

// Pantalla de captura de notas compartida por maestro y administrador
export default async function CapturaNotas({
  asignacionId, periodoParam, base, volver,
}: { asignacionId: number; periodoParam?: string; base: string; volver: string }) {
  const actor = await requireActor();
  const asig = await prisma.asignacionCurso.findUnique({
    where: { id: asignacionId },
    include: { curso: true, maestro: true, seccion: { include: { grado: true, ciclo: true } } },
  });
  if (!asig) notFound();
  if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) redirect("/maestro");

  const cfg = await prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const periodos = await prisma.periodo.findMany({ where: { cicloId: asig.seccion.cicloId }, orderBy: { numero: "asc" } });
  if (periodos.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Todavía no hay periodos (bimestres) para este ciclo. {actor.rol === "ADMIN" ? <Link href="/admin/notas" className="underline">Créalos aquí.</Link> : "Pide al administrador que los cree."}
      </p>
    );
  }
  const elegido = periodos.find((p) => String(p.id) === periodoParam) ?? periodos.find((p) => p.abierto) ?? periodos[0];

  const inscripciones = await prisma.inscripcion.findMany({
    where: { seccionId: asig.seccionId, cicloId: asig.seccion.cicloId, alumno: { activo: true } },
    include: { alumno: true, notas: { where: { cursoId: asig.cursoId } } },
    orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
  });

  const actividades = await prisma.actividad.findMany({
    where: { asignacionId, periodoId: elegido.id },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    include: { notas: true },
  });
  const usaActividades = actividades.length > 0;
  const zonaMax = cfg.zonaMax;

  const filas = inscripciones.map((i) => {
    const n = i.notas.find((x) => x.periodoId === elegido.id);
    return {
      inscripcionId: i.id, nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`, carnet: i.alumno.carnet,
      zona: n?.zona != null ? String(num(n.zona)) : n ? String(num(n.valor)) : "",
      examen: n?.examen != null ? String(num(n.examen)) : "",
      obs: n?.observacion ?? "",
    };
  });

  const valoresPeriodo = inscripciones.map((i) => {
    const n = i.notas.find((x) => x.periodoId === elegido.id);
    return n ? num(n.valor) : null;
  });
  const conNota = valoresPeriodo.filter((x): x is number => x !== null);
  const aprobados = conNota.filter((x) => x >= cfg.notaMinima).length;
  const filasAct = inscripciones.map((i) => {
    const n = i.notas.find((x) => x.periodoId === elegido.id);
    const puntos: Record<number, string> = {};
    for (const a of actividades) {
      const np = a.notas.find((x) => x.inscripcionId === i.id);
      if (np) puntos[a.id] = String(num(np.puntos));
    }
    return {
      inscripcionId: i.id, nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`, carnet: i.alumno.carnet, puntos,
      examen: n?.examen != null ? String(num(n.examen)) : "", obs: n?.observacion ?? "",
    };
  });
  const hayPuntos = actividades.some((a) => a.notas.length > 0);
  const cerrado = !elegido.abierto;
  const soloLectura = cerrado && actor.rol !== "ADMIN";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BotonVolver href={volver}>Volver</BotonVolver>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{asig.curso.nombre}</h1>
          <p className="text-sm text-slate-500">
            {asig.seccion.grado.nombre} {asig.seccion.nombre} · Ciclo {asig.seccion.ciclo.anio} · Maestro: {asig.maestro.nombres} {asig.maestro.apellidos}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          <a
            href={`${base}/${asignacionId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            title="Descargar cuadro consolidado de notas en formato PDF"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-rose-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Cuadro PDF</span>
          </a>

          <a
            href={`${base}/${asignacionId}/csv`}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            title="Exportar cuadro consolidado de notas a Microsoft Excel (CSV con BOM)"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-emerald-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M8 13h2" />
              <path d="M8 17h2" />
              <path d="M14 13h2" />
              <path d="M14 17h2" />
            </svg>
            <span>Exportar Excel</span>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {periodos.map((p) => (
          <Link
            key={p.id} href={`${base}/${asignacionId}?periodo=${p.id}`}
            className={`rounded-full border px-4 py-1.5 text-sm ${p.id === elegido.id ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
          >
            {p.nombre} {!p.abierto && "🔒"}
          </Link>
        ))}
      </div>

      {cerrado && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Este periodo está cerrado. {soloLectura ? "Solo puedes consultarlo." : "Como administrador todavía puedes corregir notas."}
        </p>
      )}

      <p className="text-sm text-slate-600">
        {conNota.length} de {filas.length} con nota
        {conNota.length > 0 && <> · Promedio del curso: <b>{fmtNota(promedio(conNota))}</b> · Aprobados: <b>{aprobados}</b> · Reprobados: <b className="text-red-600">{conNota.length - aprobados}</b></>}
      </p>

      {!soloLectura && (
        <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h10M4 12h16M4 18h8M17 4v4M15 6h4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800">Estructura de la nota</div>
              <div className="text-xs text-slate-500">
                {usaActividades
                  ? `${actividades.length} actividad(es) · ${actividades.reduce((t, x) => t + num(x.puntos), 0)} de ${zonaMax} pts de zona · examen ${100 - zonaMax}`
                  : `Zona ${zonaMax} + examen ${100 - zonaMax}. Desglosa la zona en tareas, pruebas cortas, etc.`}
              </div>
            </div>
            <span className="hidden shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 sm:inline">
              {usaActividades ? "Editar" : "Configurar"}
            </span>
            <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </summary>
          <div className="border-t border-slate-100 p-4">
            <ActividadesForm
              key={`${elegido.id}-${actividades.map((x) => `${x.id}:${x.puntos}`).join(",")}`}
              action={guardarActividades.bind(null, asignacionId, elegido.id)}
              iniciales={actividades.map((x) => ({ id: x.id, nombre: x.nombre, puntos: num(x.puntos) }))}
              zonaMax={zonaMax} hayPuntos={hayPuntos} otrosPeriodos={periodos.length - 1}
            />
          </div>
        </details>
      )}

      {usaActividades ? (
        <NotasActividades
          action={guardarNotasActividades.bind(null, asignacionId, elegido.id)}
          filas={filasAct}
          actividades={actividades.map((x) => ({ id: x.id, nombre: x.nombre, puntos: num(x.puntos) }))}
          zonaMax={zonaMax} examenMax={100 - zonaMax} minima={cfg.notaMinima} soloLectura={soloLectura}
          key={`a-${elegido.id}-${actividades.map((x) => x.id).join(",")}-${hayPuntos}`}
          archivo={`${asig.curso.nombre}-${asig.seccion.grado.nombre}-${asig.seccion.nombre}-${elegido.nombre}`}
        />
      ) : (
        <NotasForm
          action={guardarNotas.bind(null, asignacionId, elegido.id)}
          filas={filas} zonaMax={cfg.zonaMax} examenMax={100 - cfg.zonaMax} minima={cfg.notaMinima}
          soloLectura={soloLectura} key={elegido.id}
          archivo={`${asig.curso.nombre}-${asig.seccion.grado.nombre}-${asig.seccion.nombre}-${elegido.nombre}`}
        />
      )}
    </div>
  );
}
