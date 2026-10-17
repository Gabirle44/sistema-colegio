import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerMorosos, totalDeuda } from "@/lib/cobros/morosos";
import { enlaceWhatsApp, fechaCorta, quetzales } from "@/lib/cobros/utils";
import { td, th } from "@/lib/ui";

type SP = Promise<{ grado?: string; min?: string }>;

export default async function MorososPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const gradoId = Number(sp.grado) || undefined;
  const minCuotas = Math.max(1, Number(sp.min) || 1);
  const [{ ciclo, config, morosos }, grados] = await Promise.all([
    obtenerMorosos({ gradoId, minCuotas }),
    prisma.grado.findMany({ orderBy: { orden: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Morosos {ciclo ? `· Ciclo ${ciclo.anio}` : ""}</h1>
        <a href={`/admin/reportes/export?tipo=morosos${gradoId ? `&grado=${gradoId}` : ""}&min=${minCuotas}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100">Exportar CSV (Excel)</a>
      </div>
      <form className="mt-4 flex flex-wrap gap-2 text-sm">
        <select name="grado" defaultValue={gradoId ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">Todos los grados</option>
          {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select name="min" defaultValue={String(minCuotas)} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="1">1+ cuotas vencidas</option><option value="2">2+ cuotas</option><option value="3">3+ cuotas</option>
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-4 hover:bg-slate-100">Filtrar</button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        {morosos.length} alumno(s) · Deuda vencida total: <b className="text-red-600">{quetzales(totalDeuda(morosos))}</b>
        {config.diasGracia > 0 && <> · (con {config.diasGracia} días de gracia)</>}
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Alumno</th><th className={th}>Grado</th><th className={th}>Cuotas</th><th className={th}>Deuda vencida</th>
              <th className={th}>Desde</th><th className={th}>Encargado</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {morosos.map((m) => {
              const wa = enlaceWhatsApp(
                m.telefono,
                `Estimado(a) ${m.encargado}, del ${config.nombreColegio}: le recordamos que ${m.alumno} tiene ${m.cuotasVencidas} cuota(s) vencida(s) por ${quetzales(m.deudaVencida)}. Agradecemos su pronto pago.`,
              );
              return (
                <tr key={m.inscripcionId}>
                  <td className={td}><div className="font-medium">{m.alumno}</div><div className="text-xs text-slate-500">{m.carnet}</div></td>
                  <td className={td}>{m.grado} {m.seccion}</td>
                  <td className={td}>{m.cuotasVencidas}</td>
                  <td className={`${td} font-medium text-red-600`}>{quetzales(m.deudaVencida)}</td>
                  <td className={td}>{fechaCorta(m.masAntiguo)}</td>
                  <td className={td}><div>{m.encargado}</div><div className="text-xs text-slate-500">{m.telefono ?? "sin teléfono"}</div></td>
                  <td className={`${td} space-x-3 text-right`}>
                    {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-green-700 hover:underline">WhatsApp</a>}
                    <Link href={`/admin/cobros/${m.inscripcionId}`} className="text-blue-700 hover:underline">Cobrar</Link>
                  </td>
                </tr>
              );
            })}
            {morosos.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-green-700">No hay morosos. 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
