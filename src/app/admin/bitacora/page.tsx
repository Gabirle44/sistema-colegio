import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { fechaHoraGT } from "@/lib/cobros/utils";
import { td, th } from "@/lib/ui";

export default async function BitacoraPage({ searchParams }: { searchParams: Promise<{ accion?: string }> }) {
  await requireAdmin();
  const { accion = "" } = await searchParams;
  const [registros, acciones] = await Promise.all([
    prisma.bitacora.findMany({
      where: accion ? { accion } : {},
      include: { usuario: true },
      orderBy: { id: "desc" },
      take: 200,
    }),
    prisma.bitacora.findMany({ distinct: ["accion"], select: { accion: true }, orderBy: { accion: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Bitácora</h1>
      <p className="text-sm text-slate-500">Últimos 200 movimientos: quién hizo qué y cuándo.</p>
      <form className="mt-4 flex gap-2 text-sm">
        <select name="accion" defaultValue={accion} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">Todas las acciones</option>
          {acciones.map((a) => <option key={a.accion} value={a.accion}>{a.accion}</option>)}
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-4 hover:bg-slate-100">Filtrar</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className={th}>Fecha</th><th className={th}>Usuario</th><th className={th}>Acción</th><th className={th}>Detalle</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {registros.map((b) => (
              <tr key={b.id}>
                <td className={td}>{fechaHoraGT(b.creadoEn)}</td><td className={td}>{b.usuario.nombre}</td>
                <td className={td}>{b.accion}</td><td className={td}>{b.detalle ?? `${b.entidad} #${b.entidadId ?? ""}`}</td>
              </tr>
            ))}
            {registros.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
