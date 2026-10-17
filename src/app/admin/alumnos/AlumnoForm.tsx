"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AlumnoFormState } from "./actions";

type Valores = {
  carnet?: string;
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  encargadoNombre?: string;
  encargadoTelefono?: string;
};

type Props = {
  action: (prev: AlumnoFormState, formData: FormData) => Promise<AlumnoFormState>;
  valores?: Valores;
  etiquetaBoton: string;
};

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

export default function AlumnoForm({ action, valores = {}, etiquetaBoton }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const e = state?.errors ?? {};

  const campo = (
    name: keyof Valores,
    etiqueta: string,
    opciones: { type?: string; requerido?: boolean } = {},
  ) => (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {etiqueta}
        {opciones.requerido && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={opciones.type ?? "text"}
        defaultValue={valores[name] ?? ""}
        className={input}
      />
      {e[name] && <p className="text-sm text-red-600">{e[name]}</p>}
    </div>
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-xl bg-white p-6 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        {campo("carnet", "Carnet", { requerido: true })}
        {campo("fechaNacimiento", "Fecha de nacimiento", { type: "date" })}
        {campo("nombres", "Nombres", { requerido: true })}
        {campo("apellidos", "Apellidos", { requerido: true })}
        {campo("encargadoNombre", "Nombre del encargado", { requerido: true })}
        {campo("encargadoTelefono", "Teléfono del encargado", { type: "tel" })}
      </div>

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
