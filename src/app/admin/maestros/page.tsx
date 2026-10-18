import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { aCentavos, quetzales } from "@/lib/cobros/utils";
import { btnPrimario, td, th } from "@/lib/ui";

type SP = Promise<{ q?: string; estado?: string }>;

export default async function MaestrosPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const { q = "", estado = "activos" } = await searchParams;
  const termino = q.trim();
  const maestros = await prisma.maestro.findMany({
    where: {
      ...(estado === "activos" ? { activo: true } : estado === "inactivos" ? { activo: false } : {}),
      ...(termino
        ? {
            OR: [
              { nombres: { contains: termino, mode: "insensitive" } },
              { apellidos: { contains: termino, mode: "insensitive" } },
              { usuario: { email: { contains: termino, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { usuario: true, _count: { select: { asignaciones: true } } },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });
  const planilla = maestros.filter((m) => m.activo).reduce((s, m) => s + aCentavos(m.salarioMensual), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Maestros</h1>
          <p className="text-sm text-slate-500">
            {maestros.length} registrado(s) · Planilla mensual de activos: <b className="text-slate-700">{quetzales(planilla)}</b>
          </p>
        </div>
        <Link href="/admin/maestros/nuevo" className={btnPrimario}>Nuevo maestro</Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={termino} placeholder="Buscar por nombre o correo..."
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="estado" defaultValue={estado} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-4 text-sm hover:bg-slate-100">Filtrar</button>
      </form>

      <ul className="space-y-3 md:hidden">
        {maestros.map((m) => (
          <li key={m.id}>
            <Link href={`/admin/maestros/${m.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 active:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">{m.apellidos}, {m.nombres}</div>
                  <div className="break-all text-xs text-slate-500">{m.usuario?.email ?? "Sin usuario"}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${m.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {m.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-3 flex justify-between text-sm text-slate-500">
                <span>{m._count.asignaciones} curso(s)</span>
                <b className="text-slate-800">{quetzales(aCentavos(m.salarioMensual))}</b>
              </div>
            </Link>
          </li>
        ))}
        {maestros.length === 0 && <li className="py-8 text-center text-sm text-slate-400">Sin maestros.</li>}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Maestro</th><th className={th}>Correo</th><th className={th}>Teléfono</th>
              <th className={th}>Cursos</th><th className={th}>Salario</th><th className={th}>Estado</th><th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {maestros.map((m) => (
              <tr key={m.id} className={m.activo ? "" : "opacity-60"}>
                <td className={`${td} font-medium text-slate-800`}>{m.apellidos}, {m.nombres}</td>
                <td className={td}>{m.usuario?.email ?? "—"}</td>
                <td className={td}>{m.telefono ?? "—"}</td>
                <td className={td}>{m._count.asignaciones}</td>
                <td className={td}>{quetzales(aCentavos(m.salarioMensual))}</td>
                <td className={td}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {m.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className={`${td} text-right`}>
                  <Link href={`/admin/maestros/${m.id}`} className="text-blue-700 hover:underline">Ver / editar</Link>
                </td>
              </tr>
            ))}
            {maestros.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin maestros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
