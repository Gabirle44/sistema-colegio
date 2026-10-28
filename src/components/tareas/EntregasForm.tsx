"use client";

import { useState } from "react";
import FormConAviso from "@/components/FormConAviso";
import type { AccionState } from "@/lib/cobros/tipos";

export type FilaEntrega = {
  inscripcionId: number;
  nombre: string;
  carnet: string;
  entregado: boolean;
  nota: number | "";
};

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
  puntosMaximos: number;
  filas: FilaEntrega[];
};

const iniciales = (n: string) => {
  const [ap = "", no = ""] = n.split(",").map((x) => x.trim());
  return `${ap[0] ?? ""}${no[0] ?? ""}`.toUpperCase();
};

export default function EntregasForm({ action, puntosMaximos, filas }: Props) {
  const [v, setV] = useState<Record<number, { entregado: boolean; nota: number | "" }>>(
    Object.fromEntries(filas.map((f) => [f.inscripcionId, { entregado: f.entregado, nota: f.nota }]))
  );

  const entregadosCount = filas.filter((f) => v[f.inscripcionId].entregado).length;
  const pct = filas.length ? Math.round((entregadosCount / filas.length) * 100) : 0;

  const toggleEntregado = (id: number) => {
    setV((s) => {
      const nuevoEstado = !s[id].entregado;
      return {
        ...s,
        [id]: {
          ...s[id],
          entregado: nuevoEstado,
          nota: nuevoEstado && s[id].nota === "" ? puntosMaximos : s[id].nota,
        },
      };
    });
  };

  const marcarTodosEntregados = () => {
    setV((s) =>
      Object.fromEntries(
        Object.entries(s).map(([k, x]) => [
          k,
          { entregado: true, nota: x.nota === "" ? puntosMaximos : x.nota },
        ])
      )
    );
  };

  const desmarcarTodos = () => {
    setV((s) =>
      Object.fromEntries(
        Object.entries(s).map(([k]) => [k, { entregado: false, nota: "" }])
      )
    );
  };

  return (
    <FormConAviso action={action} etiqueta="Guardar entregas y notas" limpiarSiOk={false}>
      {/* Barra de Progreso y Acciones Masivas */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="min-w-44 flex-1">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Tareas entregadas</span>
            <span className="tabular-nums">{entregadosCount} de {filas.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-600" : "bg-blue-600"}`}
              style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={marcarTodosEntregados}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Marcar todos entregados
          </button>
          <button
            type="button"
            onClick={desmarcarTodos}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Desmarcar todos
          </button>
        </div>
      </div>

      {/* Lista de Alumnos */}
      <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {filas.map((f, i) => {
          const e = v[f.inscripcionId];

          return (
            <li
              key={f.inscripcionId}
              className={`px-3 py-3 transition-colors sm:px-4 ${
                e.entregado ? "bg-emerald-50/30" : "bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-300">
                  {i + 1}
                </span>

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    e.entregado
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {iniciales(f.nombre)}
                </div>

                <div className="min-w-0 flex-1 basis-40">
                  <div className="truncate font-medium text-slate-800">{f.nombre}</div>
                  <div className="text-xs text-slate-500">{f.carnet}</div>
                </div>

                {/* Controles de Entrega y Punteo */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name={`entregado_${f.inscripcionId}`}
                      checked={e.entregado}
                      onChange={() => toggleEntregado(f.inscripcionId)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{e.entregado ? "Entregado" : "Pendiente"}</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={puntosMaximos}
                      name={`nota_${f.inscripcionId}`}
                      value={e.nota}
                      onChange={(ev) =>
                        setV((s) => ({
                          ...s,
                          [f.inscripcionId]: {
                            ...s[f.inscripcionId],
                            nota: ev.target.value !== "" ? parseFloat(ev.target.value) : "",
                          },
                        }))
                      }
                      placeholder="0.0"
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="text-xs text-slate-400 font-semibold">/ {puntosMaximos} pts</span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}

        {filas.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-slate-400">
            No hay alumnos inscritos en esta sección.
          </li>
        )}
      </ul>
    </FormConAviso>
  );
}