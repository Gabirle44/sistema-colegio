"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import type { AlumnoFormState } from "./actions";
import FotoAlumno from "@/components/FotoAlumno";

type Valores = {
  carnet?: string;
  cui?: string;
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  telefono?: string;
  encargadoNombre?: string;
  encargadoTelefono?: string;
  encargadoCorreo?: string;
};


type Props = {
  action: (prev: AlumnoFormState, formData: FormData) => Promise<AlumnoFormState>;
  valores?: Valores;
  etiquetaBoton: string;
  // Si el alumno ya existe y tiene foto, se muestra la actual
  alumnoId?: number;
  tieneFoto?: boolean;
};

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

export default function AlumnoForm({ action, valores = {}, etiquetaBoton, alumnoId, tieneFoto }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const e = state?.errors ?? {};

  const campo = (
    name: keyof Valores,
    etiqueta: string,
    opciones: { type?: string; requerido?: boolean; ayuda?: string } = {},
  ) => (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {etiqueta}
        {opciones.requerido ? (
          <span className="text-red-600"> *</span>
        ) : (
          <span className="font-normal text-slate-400"> (opcional)</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={opciones.type ?? "text"}
        defaultValue={valores[name] ?? ""}
        className={input}
      />
      {opciones.ayuda && !e[name] && <p className="text-xs text-slate-400">{opciones.ayuda}</p>}
      {e[name] && <p className="text-sm text-red-600">{e[name]}</p>}
    </div>
  );

  return (
    <form
      onSubmit={(ev) => {
        // React 19 vacía el formulario tras la acción; así conservamos lo escrito si hay errores
        ev.preventDefault();
        const datos = new FormData(ev.currentTarget);
        startTransition(() => formAction(datos));
      }}
      className="max-w-3xl space-y-8 rounded-xl bg-white p-6 shadow-sm">
      <section className="space-y-4">
        <h2 className="border-b border-slate-200 pb-2 font-semibold text-slate-800">
          Datos del alumno
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {campo("carnet", "Carnet", { requerido: true })}
          {campo("cui", "CUI", { ayuda: "13 dígitos, sin espacios ni guiones" })}
          {campo("nombres", "Nombres", { requerido: true })}
          {campo("apellidos", "Apellidos", { requerido: true })}
          {campo("fechaNacimiento", "Fecha de nacimiento", { type: "date" })}
          {campo("telefono", "Teléfono del alumno", { type: "tel" })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-slate-200 pb-2 font-semibold text-slate-800">
          Foto del alumno
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {alumnoId !== undefined && <FotoAlumno alumnoId={alumnoId} tieneFoto={!!tieneFoto} nombre="Foto actual" tamano={80} />}
          <div className="space-y-1">
            <input
              id="foto"
              name="foto"
              type="file"
              accept="image/jpeg,image/png"
              className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700"
            />
            <p className="text-xs text-slate-400">JPG o PNG, máximo 200 KB (opcional)</p>
            {e.foto && <p className="text-sm text-red-600">{e.foto}</p>}
            {tieneFoto && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="quitarFoto" /> Quitar la foto actual
              </label>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-slate-200 pb-2 font-semibold text-slate-800">
          Datos del encargado
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {campo("encargadoNombre", "Nombre del encargado", { requerido: true })}
          {campo("encargadoTelefono", "Teléfono del encargado", { type: "tel" })}
          {campo("encargadoCorreo", "Correo del encargado", { type: "email" })}
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-5 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Guardando..." : etiquetaBoton}
        </button>
        <Link
          href="/admin/alumnos"
          className="rounded-lg border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
