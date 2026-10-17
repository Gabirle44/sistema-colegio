"use client";

import { useActionState, useState } from "react";
import { login } from "./actions";

const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const [ver, setVer] = useState(false);

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Portada: página de cuaderno, con margen amarillo y renglones */}
      <section
        className="relative flex flex-col justify-between overflow-hidden bg-[#15233b] px-8 py-8 text-white sm:px-12 lg:py-12"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 35px, rgba(255,255,255,0.07) 35px, rgba(255,255,255,0.07) 36px)",
        }}
      >
        <div aria-hidden="true" className="absolute inset-y-0 left-8 w-px bg-amber-300/70 sm:left-12" />
        <div className="relative pl-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300 text-base font-extrabold text-[#15233b]">
            CN
          </div>
        </div>
        <div className="relative py-10 pl-6 lg:py-0">
          <h1 className="max-w-md text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Colegio Nuevo Horizonte
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">
            Inscripciones, cobros, notas y boletas del colegio, en un solo lugar.
          </p>
        </div>
        <p className="relative hidden pl-6 text-sm text-slate-400 lg:block">Sistema de gestión contable y académica</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center bg-slate-50 px-6 py-12 sm:px-10">
        <form action={action} className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-slate-500">Usa el correo y la contraseña que te dio la administración.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Correo</label>
            <input id="email" name="email" type="email" required autoFocus autoComplete="email" placeholder="nombre@colegio.edu.gt" className={campo} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
            <div className="relative">
              <input id="password" name="password" type={ver ? "text" : "password"} required autoComplete="current-password" className={`${campo} pr-24`} />
              <button
                type="button"
                onClick={() => setVer((v) => !v)}
                aria-pressed={ver}
                className="absolute inset-y-1.5 right-1.5 rounded-md px-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                {ver ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {state?.error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-700 py-3 text-base font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="text-center text-xs text-slate-400">¿Olvidaste tu contraseña? Pídela a la administración.</p>
        </form>
      </section>
    </main>
  );
}
