"use client";

import FormConAviso from "@/components/FormConAviso";
import { crearInscripcion } from "../actions";
import { inputCls } from "@/lib/ui";

type Op = { id: number; texto: string };

export default function InscripcionForm({ alumnos, secciones }: { alumnos: Op[]; secciones: Op[] }) {
  const campo = (etiqueta: string, nombre: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="text-sm font-medium text-slate-700">{etiqueta}</label>
      <input name={nombre} inputMode="decimal" className={inputCls} {...extra} />
    </div>
  );
  return (
    <FormConAviso
      action={crearInscripcion} etiqueta="Inscribir y generar cargos" etiquetaCargando="Inscribiendo..." limpiarSiOk={false}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div>
        <label className="text-sm font-medium text-slate-700">Alumno</label>
        <select name="alumnoId" defaultValue="" className={inputCls}>
          <option value="" disabled>Selecciona...</option>
          {alumnos.map((a) => <option key={a.id} value={a.id}>{a.texto}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Grado y sección</label>
        <select name="seccionId" defaultValue="" className={inputCls}>
          <option value="" disabled>Selecciona...</option>
          {secciones.map((s) => <option key={s.id} value={s.id}>{s.texto}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {campo("Inscripción (Q)", "montoInscripcion", { placeholder: "0.00" })}
        {campo("Mensualidad (Q)", "montoMensualidad", { placeholder: "0.00" })}
        {campo("Descuento en inscripción (Q)", "descuentoInscripcion", { placeholder: "0.00" })}
        {campo("Descuento por mensualidad (Q)", "descuentoMensualidad", { placeholder: "0.00" })}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Motivo del descuento <span className="font-normal text-slate-400">(si aplica)</span></label>
        <input name="motivoDescuento" className={inputCls} placeholder="Ej. Beca 50%, hermanos" />
      </div>
    </FormConAviso>
  );
}
