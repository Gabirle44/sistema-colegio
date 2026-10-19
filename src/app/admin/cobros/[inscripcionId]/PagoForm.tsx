"use client";

import { useMemo, useState } from "react";
import FormConAviso from "@/components/FormConAviso";
import { registrarPago } from "../actions";
import { inputCls } from "@/lib/ui";

export type CargoPendiente = {
  id: number;
  descripcion: string;
  saldo: number; // centavos
  vencido: boolean;
  vence: string;
  concepto: string;
};

const q = (c: number) => `Q${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PagoForm({
  inscripcionId, cargos, recargoMora,
}: { inscripcionId: number; cargos: CargoPendiente[]; recargoMora: number }) {
  const [sel, setSel] = useState<Record<number, string>>({});
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [conRecargo, setConRecargo] = useState(false);

  const marcados = cargos.filter((c) => sel[c.id] !== undefined);
  const mensualidadesVencidasMarcadas = marcados.filter((c) => c.vencido && c.concepto === "MENSUALIDAD").length;
  const total = useMemo(() => {
    const base = marcados.reduce((s, c) => s + Math.round((Number(sel[c.id]) || 0) * 100), 0);
    return base + (conRecargo ? mensualidadesVencidasMarcadas * recargoMora : 0);
  }, [marcados, sel, conRecargo, mensualidadesVencidasMarcadas, recargoMora]);

  function alternar(c: CargoPendiente) {
    setSel((s) => {
      const n = { ...s };
      if (n[c.id] !== undefined) delete n[c.id];
      else n[c.id] = (c.saldo / 100).toFixed(2);
      return n;
    });
  }
  function rapido(cant: number | "vencidos") {
    const lista = cant === "vencidos" ? cargos.filter((c) => c.vencido) : cargos.slice(0, cant);
    const n: Record<number, string> = {};
    for (const c of lista) n[c.id] = (c.saldo / 100).toFixed(2);
    setSel(n);
  }

  if (cargos.length === 0) return <p className="text-sm text-green-700">No hay cuotas pendientes. ¡Alumno solvente!</p>;

  return (
    <FormConAviso
      action={registrarPago.bind(null, inscripcionId)}
      etiqueta="Cobrar y generar recibo"
      etiquetaCargando="Generando recibo..."
      limpiarSiOk={false}
      botonClase="mt-4 rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
    >
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="py-1 text-slate-500">Selección rápida:</span>
        {[1, 2, 3, 6].map((n) => (
          <button type="button" key={n} onClick={() => rapido(n)} className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100">
            Próximas {n}
          </button>
        ))}
        <button type="button" onClick={() => rapido("vencidos")} className="rounded-full border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50">
          Todo lo vencido
        </button>
        <button type="button" onClick={() => setSel({})} className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100">
          Limpiar
        </button>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {cargos.map((c) => {
          const on = sel[c.id] !== undefined;
          return (
            <div key={c.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${on ? "bg-blue-50" : ""}`}>
              <input
                type="checkbox" name={on ? `cargo_${c.id}` : undefined} checked={on}
                onChange={() => alternar(c)} className="h-4 w-4"
              />
              <div className="min-w-48 flex-1 text-sm">
                <div className="font-medium text-slate-800">{c.descripcion}</div>
                <div className="text-xs text-slate-500">
                  Vence {c.vence}{c.vencido && <span className="ml-1 font-medium text-red-600">· vencido</span>} · Saldo {q(c.saldo)}
                </div>
              </div>
              {on && (
                <input
                  name={`monto_${c.id}`} value={sel[c.id]} inputMode="decimal"
                  onChange={(e) => setSel((s) => ({ ...s, [c.id]: e.target.value }))}
                  className={`${inputCls} w-28 text-right`} aria-label={`Monto a pagar de ${c.descripcion}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {recargoMora > 0 && mensualidadesVencidasMarcadas > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="cobrarRecargo" checked={conRecargo} onChange={(e) => setConRecargo(e.target.checked)} />
          Cobrar recargo por mora ({q(recargoMora)} × {mensualidadesVencidasMarcadas} mensualidad(es) vencida(s))
        </label>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Método de pago</label>
          <select name="metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)} className={inputCls}>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="DEPOSITO">Depósito</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Boleta / referencia{metodo === "EFECTIVO" && <span className="font-normal text-slate-400"> (opcional)</span>}
          </label>
          <input name="referencia" className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Observaciones <span className="font-normal text-slate-400">(opcional)</span></label>
          <input name="observaciones" className={inputCls} />
        </div>
      </div>
      <p className="mt-4 text-lg font-bold text-slate-800">Total a cobrar: {q(total)}</p>
    </FormConAviso>
  );
}
