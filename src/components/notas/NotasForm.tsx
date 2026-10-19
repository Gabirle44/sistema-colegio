"use client";

import { useState } from "react";
import PanelImportar from "./PanelImportar";
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
  archivo?: string; // nombre base para la plantilla CSV
};

const celda = "w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100";

function total(z: string, e: string): number | null {
  const a = z.trim() === "" ? null : Number(z.replace(",", "."));
  const b = e.trim() === "" ? null : Number(e.replace(",", "."));
  if (a === null && b === null) return null;
  const s = (a ?? 0) + (b ?? 0);
  return Number.isFinite(s) ? Math.round(s * 100) / 100 : null;
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Separa una línea CSV respetando comillas; el separador puede ser , ; o tabulador
function partirLinea(linea: string, sep: string): string[] {
  const out: string[] = [];
  let actual = "";
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (comillas && linea[i + 1] === '"') { actual += '"'; i++; } else comillas = !comillas;
    } else if (c === sep && !comillas) { out.push(actual); actual = ""; } else actual += c;
  }
  out.push(actual);
  return out.map((x) => x.trim());
}

export default function NotasForm({ action, filas, zonaMax, examenMax, minima, soloLectura, archivo = "notas" }: Props) {
  const [v, setV] = useState<Record<number, { zona: string; examen: string; obs: string }>>(
    Object.fromEntries(filas.map((f) => [f.inscripcionId, { zona: f.zona, examen: f.examen, obs: f.obs }])),
  );
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function descargarPlantilla() {
    const esc = (t: string) => (/[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
    const lineas = [
      ["carnet", "alumno", `zona (0-${zonaMax})`, `examen (0-${examenMax})`, "observacion"].join(","),
      ...filas.map((f) => [f.carnet, f.nombre, v[f.inscripcionId].zona, v[f.inscripcionId].examen, v[f.inscripcionId].obs].map(esc).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${archivo.replace(/[^\w\-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function leerArchivo(file: File) {
    setAviso(null);
    try {
      const texto = (await file.text()).replace(/^\uFEFF/, "");
      const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lineas.length < 2) throw new Error("El archivo está vacío.");
      const sep = [";", "\t", ","].reduce((mejor, c) => (lineas[0].split(c).length > lineas[0].split(mejor).length ? c : mejor), ",");
      const enc = partirLinea(lineas[0], sep).map(sinTildes);
      const col = (nombre: string) => enc.findIndex((h) => h.startsWith(nombre));
      const iCarnet = col("carnet"), iZona = col("zona"), iExamen = col("examen"), iObs = col("observ");
      if (iCarnet < 0 || (iZona < 0 && iExamen < 0)) {
        throw new Error('Usa la plantilla: debe tener las columnas "carnet", "zona" y "examen".');
      }
      const porCarnet = new Map(filas.map((f) => [f.carnet.trim().toLowerCase(), f.inscripcionId]));
      const nuevo = { ...v };
      let cargadas = 0;
      const noEncontrados: string[] = [];
      const invalidos: string[] = [];
      const valido = (t: string, max: number) => {
        if (t === "") return true;
        const n = Number(t.replace(",", "."));
        return Number.isFinite(n) && n >= 0 && n <= max;
      };
      for (const l of lineas.slice(1)) {
        const c = partirLinea(l, sep);
        const carnet = (c[iCarnet] ?? "").trim();
        if (!carnet) continue;
        const id = porCarnet.get(carnet.toLowerCase());
        if (id === undefined) { noEncontrados.push(carnet); continue; }
        const zona = iZona >= 0 ? (c[iZona] ?? "") : nuevo[id].zona;
        const examen = iExamen >= 0 ? (c[iExamen] ?? "") : nuevo[id].examen;
        if (!valido(zona, zonaMax) || !valido(examen, examenMax)) { invalidos.push(carnet); }
        nuevo[id] = { zona, examen, obs: iObs >= 0 ? (c[iObs] ?? "") : nuevo[id].obs };
        cargadas++;
      }
      setV(nuevo);
      const partes = [`${cargadas} alumno(s) cargados. Revisa y pulsa "Guardar notas" para que queden registrados.`];
      if (noEncontrados.length) partes.push(`Carnets que no están en esta sección: ${noEncontrados.slice(0, 5).join(", ")}${noEncontrados.length > 5 ? "…" : ""}.`);
      if (invalidos.length) partes.push(`Notas fuera de rango (no se podrán guardar) en: ${invalidos.slice(0, 5).join(", ")}${invalidos.length > 5 ? "…" : ""}.`);
      setAviso({ tipo: noEncontrados.length || invalidos.length ? "error" : "ok", texto: partes.join(" ") });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo leer el archivo." });
    }
  }

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
                  <input name={`obs_${f.inscripcionId}`} value={v[f.inscripcionId].obs} disabled={soloLectura}
                    onChange={(e) => setV((st) => ({ ...st, [f.inscripcionId]: { ...st[f.inscripcionId], obs: e.target.value } }))}
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
      <PanelImportar
        ayuda="Descarga la plantilla, llénala en Excel (guárdala como CSV) y súbela. Se llena la tabla; tú revisas y guardas."
        onDescargar={descargarPlantilla} onArchivo={(f) => void leerArchivo(f)} aviso={aviso}
      />
      {tabla}
      <p className="mt-2 text-xs text-slate-500">Deja zona y examen vacíos para quitar la nota de un alumno. En rojo: debajo de {minima}.</p>
    </FormConAviso>
  );
}
