"use client";

import { useActionState, useState } from "react";
import { DIAS_SEMANA } from "@/lib/horarios/types";
import { crearBloqueHorarioAction } from "@/lib/horarios/actions";
import { inputCls, btnPrimario } from "@/lib/ui";

interface AsignacionOpcion {
  id: number;
  curso: { id: number; nombre: string };
  maestro: { id: number; nombres: string; apellidos: string };
}

interface Props {
  asignaciones: AsignacionOpcion[];
  seccionNombre: string;
}

const PERIODOS_PREDETERMINADOS = [
  { etiqueta: "P1 (07:30 - 08:15)", inicio: "07:30", fin: "08:15" },
  { etiqueta: "P2 (08:15 - 09:00)", inicio: "08:15", fin: "09:00" },
  { etiqueta: "P3 (09:00 - 09:45)", inicio: "09:00", fin: "09:45" },
  { etiqueta: "P4 (10:15 - 11:00)", inicio: "10:15", fin: "11:00" },
  { etiqueta: "P5 (11:00 - 11:45)", inicio: "11:00", fin: "11:45" },
  { etiqueta: "P6 (11:45 - 12:30)", inicio: "11:45", fin: "12:30" },
  { etiqueta: "P7 (12:30 - 13:15)", inicio: "12:30", fin: "13:15" },
];

export default function FormBloqueHorario({ asignaciones, seccionNombre }: Props) {
  const [state, formAction, pending] = useActionState(crearBloqueHorarioAction, undefined);
  const [horaInicio, setHoraInicio] = useState("07:30");
  const [horaFin, setHoraFin] = useState("08:15");
  const [diaSemana, setDiaSemana] = useState<number>(1);
  const [mostrarPresets, setMostrarPresets] = useState(true);

  if (asignaciones.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Esta sección no tiene cursos ni maestros asignados. Ve a{" "}
        <a href="/admin/academico" className="font-semibold underline">
          Académico
        </a>{" "}
        para asignar materias a esta sección antes de configurar el horario.
      </div>
    );
  }

  const aplicarPreset = (inicio: string, fin: string) => {
    setHoraInicio(inicio);
    setHoraFin(fin);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Agregar clase al horario</h3>
          <p className="text-xs text-slate-500">
            Sección: <span className="font-semibold text-slate-700">{seccionNombre}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarPresets((p) => !p)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium self-start sm:self-auto"
        >
          {mostrarPresets ? "Ocultar periodos sugeridos" : "Ver periodos sugeridos"}
        </button>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          <svg className="h-5 w-5 shrink-0 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold">Conflicto en el horario detectado:</p>
            <p className="mt-0.5">{state.error}</p>
          </div>
        </div>
      )}

      {state?.ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          ✓ {state.ok}
        </div>
      )}

      {/* Periodos escolares predeterminados para agilidad */}
      {mostrarPresets && (
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 space-y-2">
          <span className="text-xs font-semibold text-slate-600">Periodos estándar sugeridos:</span>
          <div className="flex flex-wrap gap-1.5">
            {PERIODOS_PREDETERMINADOS.map((p) => {
              const seleccionado = horaInicio === p.inicio && horaFin === p.fin;
              return (
                <button
                  key={p.etiqueta}
                  type="button"
                  onClick={() => aplicarPreset(p.inicio, p.fin)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    seleccionado
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {p.etiqueta}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
        {/* Materia / Docente */}
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="asignacionId" className="text-xs font-medium text-slate-700">
            Curso y Maestro
          </label>
          <select id="asignacionId" name="asignacionId" required className={inputCls}>
            <option value="">Selecciona un curso...</option>
            {asignaciones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.curso.nombre} — Prof. {a.maestro.nombres} {a.maestro.apellidos}
              </option>
            ))}
          </select>
        </div>

        {/* Día de la semana */}
        <div className="space-y-1">
          <label htmlFor="diaSemana" className="text-xs font-medium text-slate-700">
            Día
          </label>
          <select
            id="diaSemana"
            name="diaSemana"
            value={diaSemana}
            onChange={(e) => setDiaSemana(Number(e.target.value))}
            className={inputCls}
          >
            {DIAS_SEMANA.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Horas */}
        <div className="space-y-1">
          <label htmlFor="horaInicio" className="text-xs font-medium text-slate-700">
            Inicio - Fin
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="horaInicio"
              name="horaInicio"
              type="time"
              required
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              id="horaFin"
              name="horaFin"
              type="time"
              required
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Botón Guardar */}
        <div>
          <button
            type="submit"
            disabled={pending}
            className={`${btnPrimario} w-full flex items-center justify-center gap-2`}
          >
            {pending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Validando...</span>
              </>
            ) : (
              <span>+ Asignar a horario</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
