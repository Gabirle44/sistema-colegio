"use client";

import FormConAviso from "@/components/FormConAviso";
import type { AccionState } from "@/lib/cobros/tipos";

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
};

export default function TareaNuevaForm({ action }: Props) {
  return (
    <FormConAviso action={action} etiqueta="Publicar tarea" limpiarSiOk={true}>
      <div className="space-y-3 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-700">Título de la tarea</label>
          <input
            type="text"
            name="titulo"
            required
            placeholder="Ej: Ejercicios Pág. 45"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">Puntos máximos</label>
          <input
            type="number"
            step="0.01"
            name="puntos"
            required
            defaultValue="10"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">Fecha límite de entrega</label>
          <input
            type="date"
            name="fechaEntrega"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">Descripción / Indicaciones (Opcional)</label>
          <textarea
            name="descripcion"
            rows={3}
            placeholder="Instrucciones adicionales para el alumno..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>
    </FormConAviso>
  );
}