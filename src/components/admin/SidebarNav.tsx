"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = readonly [texto: string, href: string, icono: string];

const GRUPOS: readonly { titulo: string | null; items: readonly Item[] }[] = [
  { titulo: null, items: [["Inicio", "/admin", "M3 11 12 3l9 8M5 9.5V21h14V9.5M10 21v-6h4v6"]] },
  {
    titulo: "Alumnado",
    items: [
      ["Alumnos", "/admin/alumnos", "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0"],
      ["Académico", "/admin/academico", "M2 9l10-5 10 5-10 5L2 9ZM6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"],
      ["Promoción", "/admin/promocion", "M12 20V5M6 11l6-6 6 6M5 20h14"],
    ],
  },
  {
    titulo: "Caja",
    items: [
      ["Cobros", "/admin/cobros", "M3 7h18v11H3zM12 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v.01M18 15v.01"],
      ["Recibos", "/admin/recibos", "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"],
      ["Morosos", "/admin/morosos", "M12 4 2.5 20h19L12 4ZM12 10v4M12 17v.01"],
      ["Cierre de caja", "/admin/caja", "M5 4h14v16H5zM8 8h8M8 12h2M14 12h2M8 16h2M14 16h2"],
      ["Reportes", "/admin/reportes", "M5 20V11M12 20V4M19 20v-6"],
    ],
  },
  {
    titulo: "Calificaciones",
    items: [
      ["Notas", "/admin/notas", "M9 3h6v4H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4"],
      ["Boletas", "/admin/boletas", "M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.5 13.5 7 21l5-3 5 3-1.5-7.5"],
    ],
  },
  {
    titulo: "Sistema",
    items: [
      ["Configuración", "/admin/configuracion", "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4"],
      ["Bitácora", "/admin/bitacora", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2"],
    ],
  },
];

export default function SidebarNav({ avisos = {} }: { avisos?: Record<string, number> }) {
  const pathname = usePathname();
  const activo = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <nav className="space-y-6 text-sm" aria-label="Principal">
      {GRUPOS.map((g, i) => (
        <div key={i}>
          {g.titulo && <div className="mb-1.5 px-3 text-xs font-medium text-slate-400">{g.titulo}</div>}
          <ul className="space-y-0.5">
            {g.items.map(([texto, href, icono]) => {
              const on = activo(href);
              const aviso = avisos[href];
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      on
                        ? "bg-white/10 font-semibold text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-amber-300"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${on ? "text-amber-300" : "text-slate-400"}`}>
                      <path d={icono} />
                    </svg>
                    <span className="flex-1">{texto}</span>
                    {aviso ? (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white tabular-nums" aria-label={`${aviso} pendientes`}>
                        {aviso}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
