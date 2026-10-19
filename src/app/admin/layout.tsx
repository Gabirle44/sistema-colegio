import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/session";
import { logout } from "../login/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Navbar Superior */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Título o Logo del Colegio */}
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-lg font-bold tracking-wide text-blue-400">
                SISTEMA ESCOLAR
              </Link>

              {/* Menú Principal: Únicamente Estructura Académica (Módulo A) */}
              <nav className="flex items-center gap-1 text-sm font-medium">
                <div className="relative group py-5">
                  <button className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-slate-800 transition text-slate-200">
                    ESTRUCTURA ACADÉMICA
                    <span className="text-xs opacity-70">▼</span>
                  </button>

                  {/* Submenú desplegable */}
                  <div className="absolute left-0 top-full hidden group-hover:block w-48 bg-white text-slate-800 shadow-xl rounded-b-lg border border-slate-200 py-2 z-50">
                    <Link
                      href="/admin/grados"
                      className="block px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      Grados
                    </Link>
                    <Link
                      href="/admin/secciones"
                      className="block px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      Secciones
                    </Link>
                    <Link
                      href="/admin/cursos"
                      className="block px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      Cursos
                    </Link>
                    <Link
                      href="/admin/periodos"
                      className="block px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      Periodos
                    </Link>
                  </div>
                </div>
              </nav>
            </div>

            {/* Botón único de Cerrar Sesión en la barra de navegación */}
            <form action={logout}>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded transition"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido de la Página */}
      <main className="py-6">{children}</main>
    </div>
  );
}