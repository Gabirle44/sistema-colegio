"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { AccionState } from "@/lib/cobros/tipos";

type Props = {
  action: (prev: AccionState, fd: FormData) => Promise<AccionState>;
  children: React.ReactNode;
  className?: string;
  limpiarSiOk?: boolean;
  etiqueta: string;
  etiquetaCargando?: string;
  confirmar?: string;
  botonClase?: string;
};

// Formulario que muestra error/éxito y NO borra lo escrito cuando hay un error.
export default function FormConAviso({
  action, children, className, limpiarSiOk = true, etiqueta, etiquetaCargando = "Guardando...", confirmar, botonClase,
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(ev) => {
        ev.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const datos = new FormData(ev.currentTarget);
        startTransition(async () => {
          formAction(datos);
        });
      }}
    >
      {children}
      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.ok && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.ok}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={botonClase ?? "mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"}
      >
        {pending ? etiquetaCargando : etiqueta}
      </button>
      <ResetOnOk estado={limpiarSiOk ? state : undefined} form={ref} />
    </form>
  );
}

function ResetOnOk({ estado, form }: { estado: AccionState; form: React.RefObject<HTMLFormElement | null> }) {
  const ultimo = useRef<AccionState>(undefined);
  // En un efecto, no durante el render: React prohibe leer o escribir refs
  // mientras renderiza, porque el resultado deja de ser predecible.
  useEffect(() => {
    if (estado?.ok && estado !== ultimo.current) {
      ultimo.current = estado;
      form.current?.reset();
    }
  }, [estado, form]);
  return null;
}
