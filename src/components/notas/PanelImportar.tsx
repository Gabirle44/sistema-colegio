"use client";

import { useRef } from "react";

type Props = {
  ayuda: string;
  onDescargar: () => void;
  onArchivo: (f: File) => void;
  aviso: { tipo: "ok" | "error"; texto: string } | null;
};

// Barra compacta para descargar la plantilla y subir las notas en CSV
export default function PanelImportar({ ayuda, onDescargar, onArchivo, aviso }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">Subir notas desde un archivo</div>
            <div className="text-xs leading-snug text-slate-500">{ayuda}</div>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button type="button" onClick={onDescargar}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex-none">
            Plantilla
          </button>
          <button type="button" onClick={() => input.current?.click()}
            className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 sm:flex-none">
            Subir CSV
          </button>
          <input ref={input} type="file" accept=".csv,text/csv,text/plain" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onArchivo(f); e.target.value = ""; }} />
        </div>
      </div>
      {aviso && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${aviso.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
