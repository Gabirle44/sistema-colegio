import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { btnPrimario, td, th } from "@/lib/ui";
import { alternarEstadoAdmin } from "./actions";

type SP = Promise<{ q?: string; estado?: string }>;

export default async function AdministradoresPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const { q = "", estado = "activos" } = await searchParams;
  const termino = q.trim();

  const usuarios = await prisma.usuario.findMany({
    where: {
      rol: "ADMIN",
      ...(estado === "activos" ? { activo: true } : estado === "inactivos" ? { activo: false } : {}),
      ...(termino ? { email: { contains: termino, mode: "insensitive" } } : {}),
    },
    orderBy: [{ nombre: "asc" }, { email: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administradores</h1>
          <p className="text-sm text-slate-500">Usuarios con acceso completo al panel administrativo.</p>
        </div>
        <Link href="/admin/usuarios/nuevo" className={btnPrimario}>+ Nuevo administrador</Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={termino} placeholder="Buscar por correo..." className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="estado" defaultValue={estado} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100">Filtrar</button>
      </form>

      <ul className="space-y-3 md:hidden">
        {usuarios.map((u) => (
          <li key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-800">{u.nombre}</div>
                <div className="break-all text-xs text-slate-500">{u.email}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {u.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/usuarios/${u.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">Ver</Link>
              <form action={alternarEstadoAdmin.bind(null, u.id)} className="inline-block">
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                  {u.activo ? "Desactivar" : "Reactivar"}
                </button>
              </form>
            </div>
          </li>
        ))}
        {usuarios.length === 0 && <li className="py-8 text-center text-sm text-slate-400">Sin administradores.</li>}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Nombre</th>
              <th className={th}>Correo</th>
              <th className={th}>Estado</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className={td}>{u.nombre}</td>
                <td className={td}>{u.email}</td>
                <td className={td}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/usuarios/${u.id}`} className="text-blue-700 hover:underline">Ver</Link>
                    <form action={alternarEstadoAdmin.bind(null, u.id)}>
                      <button className="text-slate-700 hover:underline">{u.activo ? "Desactivar" : "Reactivar"}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
