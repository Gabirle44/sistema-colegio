"use client";

import { useState } from "react";
import FormConAviso from "@/components/FormConAviso";
import type { AccionState } from "@/lib/cobros/tipos";

type Fila = { id?: number; nombre: string; puntos: string };

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
  iniciales: { id: number; nombre: string; puntos: number }[];
  zonaMax: number;
  hayPuntos: boolean;
  otrosPeriodos: number;
};

const SUGERIDAS = ["Actividad", "Tarea", "Prueba corta", "Laboratorio", "Participación", "Proyecto"];
const COLORES = ["#2a4fc0", "#0d9488", "#d97706", "#7c3aed", "#db2777", "#4d7c0f", "#0369a1", "#b45309"];
const r2 = (n: number) => Math.round(n * 100) / 100;
const aNum = (t: string) => { const n = Number(t.replace(",", ".")); return Number.isFinite(n) ? n : 0; };

export default function ActividadesForm({ action, iniciales, zonaMax, hayPuntos, otrosPeriodos }: Props) {
  const [filas, setFilas] = useState<Fila[]>(iniciales.map((a) => ({ id: a.id, nombre: a.nombre, puntos: String(a.puntos) })));
  const examenMax = 100 - zonaMax;
  const total = r2(filas.reduce((s, f) => s + aNum(f.puntos), 0));
  const libre = r2(zonaMax - total);
  const excede = libre < 0;

  const agregar = (base: string) => {
    const n = filas.filter((f) => f.nombre.toLowerCase().startsWith(base.toLowerCase())).length;
    const conNumero = base === "Actividad" || base === "Tarea";
    setFilas((s) => [...s, { nombre: conNumero ? `${base} ${n + 1}` : n > 0 ? `${base} ${n + 1}` : base, puntos: "" }]);
  };
  const cambiar = (i: number, k: "nombre" | "puntos", v: string) =>
    setFilas((s) => s.map((f, j) => (j === i ? { ...f, [k]: v } : f)));

  const pct = (p: number) => `${Math.max(0, Math.min(100, p))}%`;

  return (
    <FormConAviso
      action={action} etiqueta="Guardar estructura" limpiarSiOk={false}
      confirmar={hayPuntos && filas.length < iniciales.length ? "Quitaste actividades: se borran los puntos que ya capturaste en ellas. ¿Continuar?" : undefined}
    >
      <input type="hidden" name="json" value={JSON.stringify(filas.map((f) => ({ id: f.id, nombre: f.nombre, puntos: f.puntos })))} />

      {/* Barra de distribución de los 100 puntos */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Distribución de los 100 puntos</div>
          <div className={`text-sm font-semibold ${excede ? "text-red-600" : libre === 0 ? "text-green-700" : "text-slate-700"}`}>
            {excede ? `Te pasas por ${-libre} pts` : libre === 0 ? "Zona completa" : `Quedan ${libre} pts por asignar`}
          </div>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200" role="img"
          aria-label={`Zona ${total} de ${zonaMax}, examen ${examenMax}`}>
          {filas.map((f, i) => (
            <div key={f.id ?? `n${i}`} title={`${f.nombre || "Sin nombre"}: ${aNum(f.puntos)} pts`}
              style={{ width: pct(aNum(f.puntos)), background: COLORES[i % COLORES.length] }}
              className="h-full border-r border-white/70 transition-all duration-300" />
          ))}
          {libre > 0 && (
            <div style={{ width: pct(libre), backgroundImage: "repeating-linear-gradient(45deg,#e2e8f0 0 6px,#f1f5f9 6px 12px)" }} className="h-full" />
          )}
          <div style={{ width: pct(examenMax) }} className="ml-auto h-full bg-slate-800" title={`Examen: ${examenMax} pts`} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORES[0] }} />
            Zona <b className="text-slate-700">{total}</b> / {zonaMax}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" />
            Examen <b className="text-slate-700">{examenMax}</b>
          </span>
        </div>
      </div>

      {/* Lista de actividades */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filas.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-sm font-medium text-slate-700">Todavía no hay actividades</div>
            <div className="mt-1 text-xs text-slate-500">Agrega la primera con los botones de abajo. Ejemplo: Tarea 1 con 10 pts.</div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filas.map((f, i) => (
              <li key={f.id ?? `n${i}`} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
                <input
                  value={f.nombre} onChange={(e) => cambiar(i, "nombre", e.target.value)}
                  placeholder="Nombre de la actividad" aria-label={`Nombre de la actividad ${i + 1}`}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
                <div className="flex shrink-0 items-center rounded-lg border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200">
                  <input
                    value={f.puntos} onChange={(e) => cambiar(i, "puntos", e.target.value)} inputMode="decimal" placeholder="0"
                    aria-label={`Puntos de la actividad ${i + 1}`}
                    className="w-14 rounded-l-lg bg-transparent px-2 py-1.5 text-right text-sm font-semibold text-slate-800 outline-none"
                  />
                  <span className="pr-2.5 text-xs text-slate-400">pts</span>
                </div>
                <button type="button" onClick={() => setFilas((s) => s.filter((_, j) => j !== i))} aria-label="Quitar actividad"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Agregar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-slate-500">Agregar:</span>
        {SUGERIDAS.map((s) => (
          <button key={s} type="button" onClick={() => agregar(s)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-600 hover:text-blue-700">
            <span className="text-sm leading-none">+</span> {s}
          </button>
        ))}
        <button type="button" onClick={() => setFilas((s) => [...s, { nombre: "", puntos: "" }])}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-blue-600 hover:text-blue-700">
          <span className="text-sm leading-none">+</span> Otra
        </button>
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
        {otrosPeriodos > 0 && (
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" name="copiar" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
            <span>Usar esta misma estructura en los otros periodos que todavía no tienen actividades.</span>
          </label>
        )}
        <p className="text-xs text-slate-500">
          La zona de cada alumno se suma sola. Para volver a escribir la zona completa, quita todas las actividades.
        </p>
      </div>
    </FormConAviso>
  );
}
