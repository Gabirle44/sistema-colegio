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

const OPCIONES: { v: Exclude<Est, "">; corto: string; largo: string; on: string; tile: string; texto: string }[] = [
  { v: "PRESENTE", corto: "P", largo: "Presente", on: "border-green-600 bg-green-600 text-white shadow-sm", tile: "bg-green-50 ring-green-100", texto: "text-green-700" },
  { v: "TARDE", corto: "T", largo: "Tarde", on: "border-amber-500 bg-amber-500 text-white shadow-sm", tile: "bg-amber-50 ring-amber-100", texto: "text-amber-700" },
  { v: "EXCUSA", corto: "E", largo: "Excusa", on: "border-sky-600 bg-sky-600 text-white shadow-sm", tile: "bg-sky-50 ring-sky-100", texto: "text-sky-700" },
  { v: "AUSENTE", corto: "A", largo: "Ausente", on: "border-red-600 bg-red-600 text-white shadow-sm", tile: "bg-red-50 ring-red-100", texto: "text-red-700" },
];

const iniciales = (n: string) => {
  const [ap = "", no = ""] = n.split(",").map((x) => x.trim());
  return `${ap[0] ?? ""}${no[0] ?? ""}`.toUpperCase();
};

export default function AsistenciaForm({ action, filas }: Props) {
  const [v, setV] = useState<Record<number, { estado: Est; obs: string }>>(
    Object.fromEntries(filas.map((f) => [f.inscripcionId, { estado: f.estado, obs: f.obs }])),
  );
  const cuenta = (e: Est) => filas.filter((f) => v[f.inscripcionId].estado === e).length;
  const marcados = filas.length - cuenta("");
  const pct = filas.length ? Math.round((marcados / filas.length) * 100) : 0;

  const marcar = (id: number, e: Exclude<Est, "">) =>
    setV((s) => ({ ...s, [id]: { ...s[id], estado: s[id].estado === e ? "" : e } }));
  const todosPresentes = () =>
    setV((s) => Object.fromEntries(Object.entries(s).map(([k, x]) => [k, { ...x, estado: x.estado === "" ? "PRESENTE" : x.estado }])));
  const limpiar = () => setV((s) => Object.fromEntries(Object.entries(s).map(([k, x]) => [k, { ...x, estado: "" as Est, obs: "" }])));

  return (
    <FormConAviso action={action} etiqueta="Guardar asistencia" limpiarSiOk={false}>
      {/* Resumen del día */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPCIONES.map((o) => (
          <div key={o.v} className={`rounded-xl px-3 py-2.5 ring-1 ring-inset ${o.tile}`}>
            <div className={`text-2xl font-bold tabular-nums ${o.texto}`}>{cuenta(o.v)}</div>
            <div className="text-xs font-medium text-slate-600">{o.largo}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="min-w-44 flex-1">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Alumnos marcados</span>
            <span className="tabular-nums">{marcados} de {filas.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-600" : "bg-blue-600"}`} style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={todosPresentes}
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
            Todos presentes
          </button>
          <button type="button" onClick={limpiar}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Limpiar
          </button>
        </div>
      </div>

      {/* Lista */}
      <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filas.map((f, i) => {
          const e = v[f.inscripcionId];
          const sel = OPCIONES.find((o) => o.v === e.estado);
          return (
            <li key={f.inscripcionId} className={`px-3 py-3 transition-colors sm:px-4 ${e.estado === "" ? "bg-amber-50/40" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-300">{i + 1}</span>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${sel ? `${sel.tile} ${sel.texto}` : "bg-slate-100 text-slate-500"}`}>
                  {iniciales(f.nombre)}
                </div>
                <div className="min-w-0 flex-1 basis-40">
                  <div className="truncate font-medium text-slate-800">{f.nombre}</div>
                  <div className="text-xs text-slate-500">{f.carnet}</div>
                </div>
                <input type="hidden" name={`estado_${f.inscripcionId}`} value={e.estado} />
                <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-slate-50 p-1 ring-1 ring-inset ring-slate-200 sm:w-auto">
                  {OPCIONES.map((o) => (
                    <button key={o.v} type="button" onClick={() => marcar(f.inscripcionId, o.v)} aria-pressed={e.estado === o.v}
                      title={o.largo}
                      className={`rounded-lg border px-2 py-1.5 text-sm font-medium transition sm:min-w-[4.5rem] ${e.estado === o.v ? o.on : "border-transparent text-slate-600 hover:bg-white hover:shadow-sm"}`}>
                      <span className="sm:hidden">{o.corto}</span>
                      <span className="hidden sm:inline">{o.largo}</span>
                    </button>
                  ))}
                </div>
              </div>
              {e.estado !== "" && e.estado !== "PRESENTE" && (
                <div className="mt-2 sm:pl-[4.5rem]">
                  <input name={`obs_${f.inscripcionId}`} value={e.obs} placeholder="Motivo u observación (opcional)"
                    onChange={(ev) => setV((s) => ({ ...s, [f.inscripcionId]: { ...s[f.inscripcionId], obs: ev.target.value } }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
                </div>
              )}
            </li>
          );
        })}
        {filas.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-400">No hay alumnos inscritos en esta sección.</li>}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Toca otra vez un botón para desmarcarlo. Las filas en ámbar siguen sin marcar y no se registran.
      </p>
    </FormConAviso>
  );
}
