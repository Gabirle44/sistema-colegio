import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireAdmin();
  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.userId } });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/admin" className="font-bold text-slate-800">
              Colegio Nuevo Horizonte
            </Link>
            {[
              ["Alumnos", "/admin/alumnos"],
              ["Cobros", "/admin/cobros"],
              ["Recibos", "/admin/recibos"],
              ["Morosos", "/admin/morosos"],
              ["Caja", "/admin/caja"],
              ["Reportes", "/admin/reportes"],
              ["Configuración", "/admin/configuracion"],
              ["Bitácora", "/admin/bitacora"],
            ].map(([t, h]) => (
              <Link key={h} href={h} className="text-sm text-slate-600 hover:text-blue-700">
                {t}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">{usuario?.nombre}</span>
            <form action={logout}>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
