"use client";

import { useState } from "react";
import FormConAviso from "@/components/FormConAviso";
import type { AccionState } from "@/lib/cobros/tipos";
import PanelImportar from "./PanelImportar";
import { detectarSeparador, escCsv, partirLinea, sinTildes } from "@/lib/notas/csv";

export type ActividadCol = { id: number; nombre: string; puntos: number };
export type FilaAct = {
  inscripcionId: number; nombre: string; carnet: string;
  puntos: Record<number, string>; examen: string; obs: string;
};

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
  filas: FilaAct[];
  actividades: ActividadCol[];
  zonaMax: number;
  examenMax: number;
  minima: number;
  soloLectura?: boolean;
  archivo: string;
};

type Estado = Record<number, { puntos: Record<number, string>; examen: string; obs: string }>;

const num = (t: string) => {
  const s = t.trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const celda = "w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100";

export default function NotasActividades({ action, filas, actividades, zonaMax, examenMax, minima, soloLectura, archivo }: Props) {
  const [v, setV] = useState<Estado>(
    Object.fromEntries(filas.map((f) => [f.inscripcionId, { puntos: { ...f.puntos }, examen: f.examen, obs: f.obs }])),
  );
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const calc = (id: number) => {
    const e = v[id];
    const ps = actividades.map((a) => num(e.puntos[a.id] ?? ""));
    const zona = ps.some((p) => p !== null) ? Math.round(ps.reduce<number>((s, p) => s + (p ?? 0), 0) * 100) / 100 : null;
    const ex = num(e.examen);
    const total = zona === null && ex === null ? null : Math.round(((zona ?? 0) + (ex ?? 0)) * 100) / 100;
    return { zona, total };
  };

  const fuera = (t: string, max: number) => { const n = num(t); return n !== null && (n < 0 || n > max); };

  function descargarPlantilla() {
    const enc = ["carnet", "alumno", ...actividades.map((a) => `${a.nombre} (0-${a.puntos})`), `examen (0-${examenMax})`, "observacion"];
    const lineas = [
      enc.map(escCsv).join(","),
      ...filas.map((f) => {
        const e = v[f.inscripcionId];
        return [f.carnet, f.nombre, ...actividades.map((a) => e.puntos[a.id] ?? ""), e.examen, e.obs].map(escCsv).join(",");
      }),
    ];
    const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${archivo.replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function leerArchivo(file: File) {
    setAviso(null);
    try {
      const lineas = (await file.text()).replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lineas.length < 2) throw new Error("El archivo está vacío.");
      const sep = detectarSeparador(lineas[0]);
      const enc = partirLinea(lineas[0], sep).map(sinTildes);
      const iCarnet = enc.findIndex((h) => h.startsWith("carnet"));
      if (iCarnet < 0) throw new Error('Usa la plantilla: debe tener la columna "carnet".');
      const quitarRango = (h: string) => h.replace(/\s*\(.*\)\s*$/, "").trim();
      const iAct = actividades.map((a) => enc.findIndex((h) => quitarRango(h) === sinTildes(a.nombre)));
      const iExamen = enc.findIndex((h) => h.startsWith("examen"));
      const iObs = enc.findIndex((h) => h.startsWith("observ"));
      if (iAct.every((i) => i < 0) && iExamen < 0) throw new Error("No encontré columnas de actividades ni de examen. Usa la plantilla.");

      const porCarnet = new Map(filas.map((f) => [f.carnet.trim().toLowerCase(), f.inscripcionId]));
      const nuevo: Estado = JSON.parse(JSON.stringify(v));
      let cargadas = 0;
      const noEnc: string[] = [];
      const malos: string[] = [];
      for (const l of lineas.slice(1)) {
        const c = partirLinea(l, sep);
        const carnet = (c[iCarnet] ?? "").trim();
        if (!carnet) continue;
        const id = porCarnet.get(carnet.toLowerCase());
        if (id === undefined) { noEnc.push(carnet); continue; }
        let mal = false;
        actividades.forEach((a, k) => {
          if (iAct[k] < 0) return;
          const t = c[iAct[k]] ?? "";
          nuevo[id].puntos[a.id] = t;
          if (fuera(t, a.puntos)) mal = true;
        });
        if (iExamen >= 0) { nuevo[id].examen = c[iExamen] ?? ""; if (fuera(nuevo[id].examen, examenMax)) mal = true; }
        if (iObs >= 0) nuevo[id].obs = c[iObs] ?? "";
        if (mal) malos.push(carnet);
        cargadas++;
      }
      setV(nuevo);
      const partes = [`${cargadas} alumno(s) cargados. Revisa y pulsa "Guardar notas" para registrarlos.`];
      if (noEnc.length) partes.push(`Carnets que no están en esta sección: ${noEnc.slice(0, 5).join(", ")}${noEnc.length > 5 ? "…" : ""}.`);
      if (malos.length) partes.push(`Puntos fuera de rango (no se podrán guardar) en: ${malos.slice(0, 5).join(", ")}${malos.length > 5 ? "…" : ""}.`);
      setAviso({ tipo: noEnc.length || malos.length ? "error" : "ok", texto: partes.join(" ") });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo leer el archivo." });
    }
  }

  const tabla = (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="sticky left-0 z-10 min-w-44 bg-slate-50 px-3 py-3 text-left font-medium">Alumno</th>
            {actividades.map((a) => (
              <th key={a.id} className="px-2 py-3 text-right font-medium">
                <div className="max-w-24 truncate" title={a.nombre}>{a.nombre}</div>
                <div className="text-xs font-normal text-slate-400">/ {a.puntos}</div>
              </th>
            ))}
            <th className="px-2 py-3 text-right font-medium">Zona<div className="text-xs font-normal text-slate-400">/ {zonaMax}</div></th>
            <th className="px-2 py-3 text-right font-medium">Examen<div className="text-xs font-normal text-slate-400">/ {examenMax}</div></th>
            <th className="px-3 py-3 text-right font-medium">Total<div className="text-xs font-normal text-slate-400">/ 100</div></th>
            <th className="px-3 py-3 text-left font-medium">Observación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map((f) => {
            const e = v[f.inscripcionId];
            const { zona, total } = calc(f.inscripcionId);
            return (
              <tr key={f.inscripcionId}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2">
                  <div className="font-medium text-slate-800">{f.nombre}</div>
                  <div className="text-xs text-slate-500">{f.carnet}</div>
                </td>
                {actividades.map((a) => (
                  <td key={a.id} className="px-2 py-2 text-right">
                    <input
                      name={`act_${a.id}_${f.inscripcionId}`} inputMode="decimal" disabled={soloLectura}
                      value={e.puntos[a.id] ?? ""} aria-label={`${a.nombre} de ${f.nombre}`}
                      onChange={(ev) => setV((s) => ({ ...s, [f.inscripcionId]: { ...s[f.inscripcionId], puntos: { ...s[f.inscripcionId].puntos, [a.id]: ev.target.value } } }))}
                      className={`${celda} ${fuera(e.puntos[a.id] ?? "", a.puntos) ? "border-red-400 bg-red-50" : ""}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-right font-medium text-slate-700">{zona ?? "—"}</td>
                <td className="px-2 py-2 text-right">
                  <input
                    name={`examen_${f.inscripcionId}`} inputMode="decimal" disabled={soloLectura} value={e.examen}
                    aria-label={`examen de ${f.nombre}`}
                    onChange={(ev) => setV((s) => ({ ...s, [f.inscripcionId]: { ...s[f.inscripcionId], examen: ev.target.value } }))}
                    className={`${celda} ${fuera(e.examen, examenMax) ? "border-red-400 bg-red-50" : ""}`}
                  />
                </td>
                <td className={`px-3 py-2 text-right text-base font-bold ${total === null ? "text-slate-300" : total < minima ? "text-red-600" : "text-green-700"}`}>
                  {total ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <input
                    name={`obs_${f.inscripcionId}`} value={e.obs} disabled={soloLectura}
                    onChange={(ev) => setV((s) => ({ ...s, [f.inscripcionId]: { ...s[f.inscripcionId], obs: ev.target.value } }))}
                    className="w-full min-w-36 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                  />
                </td>
              </tr>
            );
          })}
          {filas.length === 0 && <tr><td colSpan={actividades.length + 5} className="px-4 py-8 text-center text-slate-400">No hay alumnos inscritos en esta sección.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  if (soloLectura) return tabla;
  return (
    <FormConAviso action={action} etiqueta="Guardar notas" limpiarSiOk={false}>
      <PanelImportar
        ayuda="Descarga la plantilla (ya trae una columna por actividad), llénala en Excel, guárdala como CSV y súbela."
        onDescargar={descargarPlantilla} onArchivo={(f) => void leerArchivo(f)} aviso={aviso}
      />
      {tabla}
      <p className="mt-2 text-xs text-slate-500">
        La zona se suma sola. Deja una casilla vacía si el alumno aún no tiene esa nota. Total en rojo: debajo de {minima}. Casilla roja: se pasa del máximo.
      </p>
    </FormConAviso>
  );
}
