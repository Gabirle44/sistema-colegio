"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";

function AvisoExitoLogin() {
  const searchParams = useSearchParams();
  if (searchParams.get("cambioPassword") === "1") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ✓ Tu contraseña se actualizó correctamente. Por seguridad tu sesión anterior se cerró; por favor ingresa con tu nueva contraseña.
      </div>
    );
  }
  return null;
}

const campo =
  "w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const FUNCIONES = [
  { t: "Cobros y recibos", d: "Cuotas, mora y cierre de caja", c: "bg-emerald-400/15 text-emerald-300", i: "M3 7h18v11H3zM12 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" },
  { t: "Notas y boletas", d: "Por bimestre, en PDF", c: "bg-orange-400/15 text-orange-300", i: "M9 3h6v4H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4" },
  { t: "Asistencia", d: "Registro diario por curso", c: "bg-sky-400/15 text-sky-300", i: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4" },
  { t: "Alumnado", d: "Fichas, fotos e inscripciones", c: "bg-violet-400/15 text-violet-300", i: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" },
] as const;

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const [ver, setVer] = useState(false);

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      {/* Portada: página de cuaderno con resplandores de color */}
      <section
        className="relative isolate flex flex-col justify-between overflow-hidden bg-[#0f1b33] px-8 py-8 text-white sm:px-12 lg:py-12"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 36px)",
        }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 -z-10 h-96 w-96 rounded-full bg-blue-600/45 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-24 -z-10 h-[26rem] w-[26rem] rounded-full bg-amber-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-1/3 right-8 -z-10 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-y-0 left-8 w-px bg-amber-300/70 sm:left-12" />

        <div className="entrada relative flex items-center gap-3 pl-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300 text-base font-extrabold text-[#0f1b33] shadow-[0_4px_16px_-4px_rgba(245,184,46,0.6)]">
            CN
          </div>
          <span className="text-sm font-medium text-slate-300">Gestión contable y académica</span>
        </div>

        <div className="relative py-10 pl-6 lg:py-0">
          <h1 className="entrada max-w-lg text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl" style={{ animationDelay: "120ms" }}>
            Colegio Nuevo Horizonte
          </h1>
          <p className="entrada mt-4 max-w-md text-base leading-relaxed text-slate-300 sm:text-lg" style={{ animationDelay: "240ms" }}>
            Inscripciones, cobros, notas y boletas del colegio, en un solo lugar.
          </p>

          <ul className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {FUNCIONES.map((f, k) => (
              <li
                key={f.t}
                className="entrada flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm"
                style={{ animationDelay: `${360 + k * 90}ms` }}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${f.c}`}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...trazo}><path d={f.i} /></svg>
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold text-white">{f.t}</span>
                  <span className="block text-xs text-slate-400">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recibo de muestra, decorativo */}
        <div aria-hidden="true" className="flotar pointer-events-none absolute bottom-10 right-10 hidden w-56 rounded-2xl bg-white p-4 text-slate-800 shadow-2xl xl:block">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Recibo de pago</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Pagado</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">Q 350.00</div>
          <div className="mt-1 text-xs text-slate-500">Mensualidad de octubre</div>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
          </div>
        </div>

        <p className="relative hidden pl-6 text-sm text-slate-400 lg:block">Universidad Mariano Gálvez · Desarrollo Web</p>
      </section>

      {/* Formulario */}
      <section
        className="flex items-center justify-center px-6 py-12 sm:px-10"
        style={{ background: "radial-gradient(700px 400px at 100% 0%, rgba(42,79,192,0.10), transparent 70%), radial-gradient(500px 300px at 0% 100%, rgba(245,184,46,0.12), transparent 70%), #f4f6fa" }}
      >
        <form action={action} className="relative w-full max-w-sm space-y-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-24px_rgba(15,27,51,0.35)] sm:p-8">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-700 via-sky-400 to-amber-300" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-slate-500">Usa el correo y la contraseña que te dio la administración.</p>
          </div>

          <Suspense fallback={null}>
            <AvisoExitoLogin />
          </Suspense>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Correo</label>
            <div className="relative">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" {...trazo}><path d="M3 6h18v12H3zM3 7l9 6 9-6" /></svg>
              <input id="email" name="email" type="email" required autoFocus autoComplete="email" placeholder="nombre@colegio.edu.gt" className={campo} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
            <div className="relative">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" {...trazo}><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
              <input id="password" name="password" type={ver ? "text" : "password"} required autoComplete="current-password" className={`${campo} pr-24`} />
              <button
                type="button"
                onClick={() => setVer((v) => !v)}
                aria-pressed={ver}
                className="absolute inset-y-1.5 right-1.5 rounded-lg px-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                {ver ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {state?.error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-blue-700 py-3 text-base font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="text-center text-xs text-slate-400">¿Olvidaste tu contraseña? Pídela a la administración.</p>
        </form>
      </section>
    </main>
  );
}
