"use client";

import { useState } from "react";
import FormConAviso from "@/components/FormConAviso";
import type { AccionState } from "@/lib/cobros/tipos";

export type FilaNota = {
  inscripcionId: number;
  nombre: string;
  carnet: string;
  zona: string;
  examen: string;
  obs: string;
};

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
  filas: FilaNota[];
  zonaMax: number;
  examenMax: number;
  minima: number;
  soloLectura?: boolean;
};

const celda = "w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100";

function total(z: string, e: string): number | null {
  const a = z.trim() === "" ? null : Number(z.replace(",", "."));
  const b = e.trim() === "" ? null : Number(e.replace(",", "."));
  if (a === null && b === null) return null;
  const s = (a ?? 0) + (b ?? 0);
  return Number.isFinite(s) ? Math.round(s * 100) / 100 : null;
}

export default function NotasForm({ action, filas, zonaMax, examenMax, minima, soloLectura }: Props) {
  const [v, setV] = useState<Record<number, { zona: string; examen: string }>>(
    Object.fromEntries(filas.map((f) => [f.inscripcionId, { zona: f.zona, examen: f.examen }])),
  );

  const tabla = (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-3 text-left font-medium">#</th>
            <th className="px-3 py-3 text-left font-medium">Alumno</th>
            <th className="px-3 py-3 text-right font-medium">Zona (0-{zonaMax})</th>
            <th className="px-3 py-3 text-right font-medium">Examen (0-{examenMax})</th>
            <th className="px-3 py-3 text-right font-medium">Total</th>
            <th className="px-3 py-3 text-left font-medium">Observación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map((f, i) => {
            const t = total(v[f.inscripcionId].zona, v[f.inscripcionId].examen);
            return (
              <tr key={f.inscripcionId}>
                <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">{f.nombre}</div>
                  <div className="text-xs text-slate-500">{f.carnet}</div>
                </td>
                {(["zona", "examen"] as const).map((k) => (
                  <td key={k} className="px-3 py-2 text-right">
                    <input
                      name={`${k}_${f.inscripcionId}`} inputMode="decimal" disabled={soloLectura}
                      value={v[f.inscripcionId][k]} aria-label={`${k} de ${f.nombre}`}
                      onChange={(e) => setV((s) => ({ ...s, [f.inscripcionId]: { ...s[f.inscripcionId], [k]: e.target.value } }))}
                      className={celda}
                    />
                  </td>
                ))}
                <td className={`px-3 py-2 text-right text-base font-bold ${t === null ? "text-slate-300" : t < minima ? "text-red-600" : "text-green-700"}`}>
                  {t === null ? "—" : t}
                </td>
                <td className="px-3 py-2">
                  <input name={`obs_${f.inscripcionId}`} defaultValue={f.obs} disabled={soloLectura}
                    className="w-full min-w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100" />
                </td>
              </tr>
            );
          })}
          {filas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay alumnos inscritos en esta sección.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  if (soloLectura) return tabla;
  return (
    <FormConAviso action={action} etiqueta="Guardar notas" limpiarSiOk={false}>
      {tabla}
      <p className="mt-2 text-xs text-slate-500">Deja zona y examen vacíos para quitar la nota de un alumno. En rojo: debajo de {minima}.</p>
    </FormConAviso>
  );
}
