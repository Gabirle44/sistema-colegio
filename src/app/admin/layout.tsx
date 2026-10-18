import { Figtree } from "next/font/google";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerMorosos } from "@/lib/cobros/morosos";
import { logout } from "../login/actions";
import SidebarNav from "@/components/admin/SidebarNav";

const figtree = Figtree({ subsets: ["latin"], display: "swap" });

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireAdmin();
  const [usuario, config, ciclo, mora] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: sesion.userId } }),
    prisma.configuracion.findUnique({ where: { id: 1 } }),
    prisma.cicloEscolar.findFirst({ where: { activo: true } }),
    obtenerMorosos().catch(() => null),
  ]);
  const nombreColegio = config?.nombreColegio ?? "Colegio Nuevo Horizonte";
  const iniciales = nombreColegio.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const avisos = { "/admin/morosos": mora?.morosos.length ?? 0 };
  const nombreUsuario = usuario?.nombre ?? "";

  const marca = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-sm font-extrabold text-[#15233b]">{iniciales}</div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-snug text-white">{nombreColegio}</div>
        <div className="mt-0.5 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">
          {ciclo ? `Ciclo ${ciclo.anio}` : "Sin ciclo activo"}
        </div>
      </div>
    </div>
  );

  const usuarioBloque = (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white" aria-hidden="true">
        {nombreUsuario.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-medium text-white">{nombreUsuario}</div>
        <div className="text-xs text-slate-400">Administración</div>
      </div>
      <form action={logout}>
        <button className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-slate-200 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300">Salir</button>
      </form>
    </div>
  );

  return (
    <div className={`${figtree.className} min-h-screen`}>
      {/* Escritorio: barra lateral fija */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[#15233b] px-3 py-5 lg:flex">
        <div className="px-3 pb-6">{marca}</div>
        <div className="scroll-menu -mr-2 flex-1 overflow-y-auto pr-2">
          <SidebarNav avisos={avisos} />
        </div>
        {/* pb-14 deja libre la esquina donde Next muestra su botón "N" en desarrollo */}
        <div className="mt-4 border-t border-white/10 px-3 pb-14 pt-4">{usuarioBloque}</div>
      </aside>

      {/* Móvil: menú desplegable */}
      <header className="sticky top-0 z-20 bg-[#15233b] px-4 py-3 lg:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            {marca}
            <span className="shrink-0 rounded-md border border-white/20 px-3 py-1 text-xs text-white group-open:bg-white/10">Menú</span>
          </summary>
          <div className="mt-4 space-y-5 pb-2">
            <SidebarNav avisos={avisos} />
            <div className="border-t border-white/10 pt-3">{usuarioBloque}</div>
          </div>
        </details>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
      </main>
    </div>
  );
}
