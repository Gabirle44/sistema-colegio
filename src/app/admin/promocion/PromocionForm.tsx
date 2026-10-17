"use client";

import FormConAviso from "@/components/FormConAviso";
import type { AccionState } from "@/lib/cobros/tipos";
import { inputCls } from "@/lib/ui";

export type FilaPromo = {
  inscripcionId: number;
  nombre: string;
  carnet: string;
  promedio: string;
  resultado: "APROBADO" | "REPROBADO" | "EN_PROCESO";
  destino: string; // seccionId por defecto o ""
};

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
  filas: FilaPromo[];
  secciones: { id: number; texto: string }[];
  montoIns: string;
  montoMes: string;
};

const etiqueta = { APROBADO: "Aprobado", REPROBADO: "Reprobado", EN_PROCESO: "En proceso" };
const color = { APROBADO: "text-green-700", REPROBADO: "text-red-600", EN_PROCESO: "text-slate-500" };

export default function PromocionForm({ action, filas, secciones, montoIns, montoMes }: Props) {
  return (
    <FormConAviso action={action} etiqueta="Inscribir en el ciclo nuevo" etiquetaCargando="Inscribiendo..." limpiarSiOk={false}
      confirmar="Se van a crear las inscripciones y todas las cuotas del ciclo activo. ¿Continuar?">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left font-medium">Alumno</th>
              <th className="px-3 py-3 text-center font-medium">Promedio</th>
              <th className="px-3 py-3 text-left font-medium">Resultado</th>
              <th className="px-3 py-3 text-left font-medium">Pasa a (ciclo activo)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((f) => (
              <tr key={f.inscripcionId}>
                <td className="px-3 py-2"><div className="font-medium">{f.nombre}</div><div className="text-xs text-slate-500">{f.carnet}</div></td>
                <td className="px-3 py-2 text-center">{f.promedio}</td>
                <td className={`px-3 py-2 ${color[f.resultado]}`}>{etiqueta[f.resultado]}</td>
                <td className="px-3 py-2">
                  <select name={`dest_${f.inscripcionId}`} defaultValue={f.destino} className={inputCls}>
                    <option value="">— No inscribir —</option>
                    {secciones.map((s) => <option key={s.id} value={s.id}>{s.texto}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Inscripción (Q)</label>
          <input name="montoInscripcion" defaultValue={montoIns} inputMode="decimal" className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Mensualidad (Q)</label>
          <input name="montoMensualidad" defaultValue={montoMes} inputMode="decimal" className={inputCls} />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" name="mantenerDescuentos" defaultChecked /> Mantener becas y descuentos del ciclo anterior
      </label>
    </FormConAviso>
  );
}
