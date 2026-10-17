import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { fmtNota, num, promedio } from "@/lib/notas/calculo";
import { guardarNotas } from "@/lib/notas/actions";
import NotasForm from "./NotasForm";

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
  const cerrado = !elegido.abierto;
  const soloLectura = cerrado && actor.rol !== "ADMIN";

  return (
    <div className="space-y-4">
      <div>
        <Link href={volver} className="text-sm text-blue-700 hover:underline">← Volver</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">{asig.curso.nombre}</h1>
        <p className="text-sm text-slate-500">
          {asig.seccion.grado.nombre} {asig.seccion.nombre} · Ciclo {asig.seccion.ciclo.anio} · Maestro: {asig.maestro.nombres} {asig.maestro.apellidos}
        </p>
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

      <NotasForm
        action={guardarNotas.bind(null, asignacionId, elegido.id)}
        filas={filas} zonaMax={cfg.zonaMax} examenMax={100 - cfg.zonaMax} minima={cfg.notaMinima}
        soloLectura={soloLectura} key={elegido.id}
      />
    </div>
  );
}
