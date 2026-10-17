import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { aCentavos, fechaHoraGT, numeroRecibo, quetzales } from "@/lib/cobros/utils";
import { td, th } from "@/lib/ui";

type SP = Promise<{ q?: string; estado?: string }>;

export default async function RecibosPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const { q = "", estado = "" } = await searchParams;
  const t = q.trim();
  const num = Number(t.replace(/\D/g, ""));
  const recibos = await prisma.recibo.findMany({
    where: {
      ...(estado === "VIGENTE" || estado === "ANULADO" ? { estado } : {}),
      ...(t
        ? {
            OR: [
              ...(num > 0 ? [{ numero: num }] : []),
              { referencia: { contains: t, mode: "insensitive" as const } },
              { inscripcion: { alumno: { OR: [
                { carnet: { contains: t, mode: "insensitive" as const } },
                { nombres: { contains: t, mode: "insensitive" as const } },
                { apellidos: { contains: t, mode: "insensitive" as const } },
              ] } } },
            ],
          }
        : {}),
    },
    include: { inscripcion: { include: { alumno: true } } },
    orderBy: { id: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Recibos</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={t} placeholder="No. de recibo, boleta, carnet o nombre..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="estado" defaultValue={estado} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todos</option><option value="VIGENTE">Vigentes</option><option value="ANULADO">Anulados</option>
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-4 text-sm hover:bg-slate-100">Buscar</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>No.</th><th className={th}>Fecha</th><th className={th}>Alumno</th>
              <th className={th}>Total</th><th className={th}>Método</th><th className={th}>Estado</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recibos.map((r) => (
              <tr key={r.id} className={r.estado === "ANULADO" ? "text-slate-400" : ""}>
                <td className={td}>{numeroRecibo(r)}</td>
                <td className={td}>{fechaHoraGT(r.fecha)}</td>
                <td className={td}>{r.inscripcion.alumno.apellidos}, {r.inscripcion.alumno.nombres}</td>
                <td className={td}>{quetzales(aCentavos(r.total))}</td>
                <td className={td}>{r.metodo}</td>
                <td className={td}>{r.estado}</td>
                <td className={td}><Link href={`/admin/recibos/${r.id}`} className="text-blue-700 hover:underline">Ver</Link></td>
              </tr>
            ))}
            {recibos.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
