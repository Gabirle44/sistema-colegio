"use client";

import { useState } from "react";
import FormConAviso from "@/components/FormConAviso";
import type { AccionState } from "@/lib/cobros/tipos";

export type Est = "" | "PRESENTE" | "TARDE" | "EXCUSA" | "AUSENTE";
export type FilaAsis = { inscripcionId: number; nombre: string; carnet: string; estado: Est; obs: string };

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
  filas: FilaAsis[];
};

const OPCIONES: { v: Exclude<Est, "">; corto: string; largo: string; on: string }[] = [
  { v: "PRESENTE", corto: "P", largo: "Presente", on: "bg-green-600 text-white border-green-600" },
  { v: "TARDE", corto: "T", largo: "Tarde", on: "bg-amber-500 text-white border-amber-500" },
  { v: "EXCUSA", corto: "E", largo: "Excusa", on: "bg-sky-600 text-white border-sky-600" },
  { v: "AUSENTE", corto: "A", largo: "Ausente", on: "bg-red-600 text-white border-red-600" },
];

export default function AsistenciaForm({ action, filas }: Props) {
  const [v, setV] = useState<Record<number, { estado: Est; obs: string }>>(
    Object.fromEntries(filas.map((f) => [f.inscripcionId, { estado: f.estado, obs: f.obs }])),
  );
  const cuenta = (e: Est) => filas.filter((f) => v[f.inscripcionId].estado === e).length;
  const sinMarcar = cuenta("");

  const marcar = (id: number, e: Exclude<Est, "">) =>
    setV((s) => ({ ...s, [id]: { ...s[id], estado: s[id].estado === e ? "" : e } }));

  return (
    <FormConAviso action={action} etiqueta="Guardar asistencia" limpiarSiOk={false}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button"
          onClick={() => setV((s) => Object.fromEntries(Object.entries(s).map(([k, x]) => [k, { ...x, estado: x.estado === "" ? "PRESENTE" : x.estado }])))}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
          Marcar a los sin marcar como presentes
        </button>
        <button type="button"
          onClick={() => setV((s) => Object.fromEntries(Object.entries(s).map(([k, x]) => [k, { ...x, estado: "" as Est }])))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Limpiar
        </button>
        <div className="ml-auto flex flex-wrap gap-1.5 text-xs">
          {OPCIONES.map((o) => (
            <span key={o.v} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{o.largo}: <b>{cuenta(o.v)}</b></span>
          ))}
          {sinMarcar > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Sin marcar: <b>{sinMarcar}</b></span>}
        </div>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filas.map((f, i) => {
          const e = v[f.inscripcionId];
          return (
            <li key={f.inscripcionId} className="px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{f.nombre}</div>
                    <div className="text-xs text-slate-500">{f.carnet}</div>
                  </div>
                </div>
                <input type="hidden" name={`estado_${f.inscripcionId}`} value={e.estado} />
                <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto">
                  {OPCIONES.map((o) => (
                    <button key={o.v} type="button" onClick={() => marcar(f.inscripcionId, o.v)} aria-pressed={e.estado === o.v}
                      title={o.largo}
                      className={`rounded-lg border px-2 py-1.5 text-sm font-medium transition sm:min-w-20 ${e.estado === o.v ? o.on : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
                      <span className="sm:hidden">{o.corto}</span>
                      <span className="hidden sm:inline">{o.largo}</span>
                    </button>
                  ))}
                </div>
              </div>
              {e.estado !== "" && e.estado !== "PRESENTE" && (
                <input name={`obs_${f.inscripcionId}`} value={e.obs} placeholder="Motivo u observación (opcional)"
                  onChange={(ev) => setV((s) => ({ ...s, [f.inscripcionId]: { ...s[f.inscripcionId], obs: ev.target.value } }))}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 sm:ml-9 sm:w-[calc(100%-2.25rem)]" />
              )}
            </li>
          );
        })}
        {filas.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">No hay alumnos inscritos en esta sección.</li>}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Toca otra vez un botón para desmarcarlo. Lo que dejes sin marcar no se registra.</p>
    </FormConAviso>
  );
}
