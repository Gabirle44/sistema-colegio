"use client";

import { useState, useTransition } from "react";
import { DIAS_SEMANA, type BloqueHorarioDetalle } from "@/lib/horarios/types";
import { eliminarBloqueHorarioAction } from "@/lib/horarios/actions";

interface Props {
  bloques: BloqueHorarioDetalle[];
  modo: "admin" | "maestro";
}

// Colores consistentes y legibles según el id del curso
const PALETA_CURSOS = [
  { bg: "bg-blue-50 border-blue-200 text-blue-900", tag: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-emerald-50 border-emerald-200 text-emerald-900", tag: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-violet-50 border-violet-200 text-violet-900", tag: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-amber-50 border-amber-200 text-amber-900", tag: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-rose-50 border-rose-200 text-rose-900", tag: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-cyan-50 border-cyan-200 text-cyan-900", tag: "bg-cyan-100 text-cyan-800", dot: "bg-cyan-500" },
  { bg: "bg-indigo-50 border-indigo-200 text-indigo-900", tag: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
];

function obtenerEstiloCurso(cursoId: number) {
  return PALETA_CURSOS[cursoId % PALETA_CURSOS.length];
}

export default function RejillaHorario({ bloques, modo }: Props) {
  const [diaMovil, setDiaMovil] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Verificar si hay clases en sábado
  const tieneSabado = bloques.some((b) => b.diaSemana === 6);
  const diasVisibles = tieneSabado
    ? DIAS_SEMANA
    : DIAS_SEMANA.filter((d) => d.id <= 5);

  // Extraer franjas horarias únicas ordenadas
  const franjasUnicas = Array.from(
    new Set(bloques.map((b) => `${b.horaInicio} - ${b.horaFin}`)),
  ).sort((a, b) => a.localeCompare(b));

  const handleEliminar = (id: number, curso: string, hora: string) => {
    if (!window.confirm(`¿Eliminar la clase de "${curso}" (${hora}) del horario?`)) {
      return;
    }
    setMensajeError(null);
    startTransition(async () => {
      const res = await eliminarBloqueHorarioAction(id);
      if (res?.error) {
        setMensajeError(res.error);
      }
    });
  };

  if (bloques.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-800">No hay bloques de horario configurados</h3>
        <p className="mt-1 text-sm text-slate-500">
          {modo === "admin"
            ? "Usa el formulario de abajo para agregar las horas de clase de esta sección."
            : "Aún no se te han asignado bloques de clases en este ciclo escolar."}
        </p>
      </div>
    );
  }

  // Filtrado para móvil por día seleccionado
  const bloquesDiaMovil = bloques
    .filter((b) => b.diaSemana === diaMovil)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  return (
    <div className="space-y-4">
      {mensajeError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {mensajeError}
        </div>
      )}

      {/* VISTA MÓVIL: Pestañas de día + Tarjetas estilo lista */}
      <div className="block md:hidden space-y-4">
        {/* Selector de día */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-200">
          {diasVisibles.map((dia) => {
            const activo = diaMovil === dia.id;
            const cantidad = bloques.filter((b) => b.diaSemana === dia.id).length;
            return (
              <button
                key={dia.id}
                type="button"
                onClick={() => setDiaMovil(dia.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
                  activo
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{dia.corto}</span>
                {cantidad > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activo ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {cantidad}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista de tarjetas del día */}
        <div className="space-y-3">
          {bloquesDiaMovil.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No hay clases programadas para este día.
            </div>
          ) : (
            bloquesDiaMovil.map((b) => {
              const estilo = obtenerEstiloCurso(b.curso.id);
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border p-4 shadow-sm transition ${estilo.bg}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${estilo.dot}`} />
                        <span className="font-semibold text-base leading-tight">
                          {b.curso.nombre}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {modo === "admin" ? (
                          <>Docente: <b>{b.maestro.nombres} {b.maestro.apellidos}</b></>
                        ) : (
                          <>Sección: <b>{b.seccion.grado.nombre} {b.seccion.nombre}</b></>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-xs font-bold text-slate-700 shadow-xs border border-slate-200/60">
                      {b.horaInicio} - {b.horaFin}
                    </span>
                  </div>

                  {modo === "admin" && (
                    <div className="mt-3 flex justify-end border-t border-slate-200/50 pt-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleEliminar(b.id, b.curso.nombre, `${b.horaInicio}-${b.horaFin}`)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        Eliminar clase
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* VISTA DESKTOP / TABLET: Rejilla completa (Horas en filas, Días en columnas) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-32 border-r border-slate-200 px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500">
                Horario
              </th>
              {diasVisibles.map((dia) => (
                <th key={dia.id} className="border-r border-slate-200 px-4 py-3 font-semibold text-center last:border-r-0">
                  {dia.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {franjasUnicas.map((franja) => {
              const [inicio, fin] = franja.split(" - ");
              return (
                <tr key={franja} className="hover:bg-slate-50/50 transition">
                  <td className="whitespace-nowrap border-r border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-bold text-slate-600">
                    {inicio} - {fin}
                  </td>
                  {diasVisibles.map((dia) => {
                    const bloque = bloques.find(
                      (b) => b.diaSemana === dia.id && b.horaInicio === inicio && b.horaFin === fin,
                    );

                    if (!bloque) {
                      return (
                        <td
                          key={dia.id}
                          className="border-r border-slate-200 p-2 text-center text-xs text-slate-300 last:border-r-0"
                        >
                          —
                        </td>
                      );
                    }

                    const estilo = obtenerEstiloCurso(bloque.curso.id);

                    return (
                      <td
                        key={dia.id}
                        className="border-r border-slate-200 p-2 align-top last:border-r-0"
                      >
                        <div className={`group relative rounded-lg border p-2.5 transition shadow-xs hover:shadow-sm ${estilo.bg}`}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-semibold text-xs leading-tight">
                              {bloque.curso.nombre}
                            </div>
                            {modo === "admin" && (
                              <button
                                type="button"
                                disabled={isPending}
                                title="Eliminar este bloque"
                                onClick={() => handleEliminar(bloque.id, bloque.curso.nombre, franja)}
                                className="opacity-0 group-hover:opacity-100 transition text-red-600 hover:text-red-800 p-0.5 rounded disabled:opacity-50"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600 leading-tight">
                            {modo === "admin" ? (
                              <span>{bloque.maestro.nombres} {bloque.maestro.apellidos}</span>
                            ) : (
                              <span className="font-medium text-slate-700">
                                {bloque.seccion.grado.nombre} &quot;{bloque.seccion.nombre}&quot;
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
