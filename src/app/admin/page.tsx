import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { logout } from "../login/actions";

export default async function AdminPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "ADMIN") redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.userId } });

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel del administrador</h1>
          <p className="text-slate-500">Bienvenido, {usuario?.nombre}</p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
            Cerrar sesión
          </button>
        </form>
      </header>
      <p className="mt-8 text-slate-600">
        Aquí irán los módulos de alumnos, cobros, pagos, recibos y reportes.
      </p>
    </main>
  );
}
