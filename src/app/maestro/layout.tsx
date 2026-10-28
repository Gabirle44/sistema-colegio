import Link from "next/link";
import { Figtree } from "next/font/google";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { logout } from "../login/actions";

const figtree = Figtree({ subsets: ["latin"], display: "swap" });

export default async function MaestroLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "MAESTRO") redirect("/login");
  const [usuario, config, ciclo] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: sesion.userId } }),
    prisma.configuracion.findUnique({ where: { id: 1 } }),
    prisma.cicloEscolar.findFirst({ where: { activo: true } }),
  ]);
  const colegio = config?.nombreColegio ?? "Colegio Nuevo Horizonte";
  const iniciales = colegio.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div className={`${figtree.className} min-h-screen bg-slate-50 text-slate-800`}>
      <header className="bg-[#15233b]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="/maestro" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300 text-sm font-extrabold text-[#15233b]">{iniciales}</span>
              <span className="hidden text-sm font-semibold text-white sm:block">{colegio}{ciclo ? ` · ${ciclo.anio}` : ""}</span>
            </a>
            <nav className="flex items-center gap-1 border-l border-white/15 pl-3 sm:pl-4">
              <a href="/maestro" className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition">
                Cursos
              </a>
              <a href="/maestro/horario" className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition">
                Horario
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/maestro/perfil"
              className="rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-white/10 hover:text-white transition flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Mi perfil</span>
            </Link>
            <span className="text-slate-200 hidden sm:inline">{usuario?.nombre}</span>
            <form action={logout}>
              <button className="rounded-md border border-white/20 px-3 py-1 text-slate-100 hover:bg-white/10">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6">{children}</main>
    </div>
  );
}
