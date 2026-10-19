import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { aCentavos, fechaHoraGT, inicioDiaGT, isoHoyGT, numeroRecibo, quetzales } from "@/lib/cobros/utils";
import { tarjeta, td, th } from "@/lib/ui";

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await requireAdmin();
  const { fecha } = await searchParams;
  const dia = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : isoHoyGT();
  const desde = inicioDiaGT(dia);
  const hasta = new Date(desde.getTime() + 86_400_000);

  const recibos = await prisma.recibo.findMany({
    where: { fecha: { gte: desde, lt: hasta } },
    include: { emitidoPor: true, inscripcion: { include: { alumno: true } } },
    orderBy: { id: "asc" },
  });
  const vigentes = recibos.filter((r) => r.estado === "VIGENTE");
  const anulados = recibos.filter((r) => r.estado === "ANULADO");

  const porMetodo = new Map<string, number>();
  const porUsuario = new Map<string, number>();
  for (const r of vigentes) {
    porMetodo.set(r.metodo, (porMetodo.get(r.metodo) ?? 0) + aCentavos(r.total));
    porUsuario.set(r.emitidoPor.nombre, (porUsuario.get(r.emitidoPor.nombre) ?? 0) + aCentavos(r.total));
  }
  const total = vigentes.reduce((s, r) => s + aCentavos(r.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Cierre de caja</h1>
        <form className="flex gap-2 text-sm">
          <input type="date" name="fecha" defaultValue={dia} className="rounded-lg border border-slate-300 px-3 py-2" />
          <button className="rounded-lg border border-slate-300 bg-white px-4 hover:bg-slate-100">Ver día</button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className={tarjeta}><div className="text-xs text-slate-500">Total del día</div><div className="text-2xl font-bold text-green-700">{quetzales(total)}</div></div>
        <div className={tarjeta}><div className="text-xs text-slate-500">Recibos vigentes</div><div className="text-2xl font-bold">{vigentes.length}</div></div>
        <div className={tarjeta}><div className="text-xs text-slate-500">Recibos anulados</div><div className="text-2xl font-bold text-red-600">{anulados.length}</div></div>
        <div className={tarjeta}>
          <div className="text-xs text-slate-500">Por método</div>
          {[...porMetodo].map(([m, c]) => <div key={m} className="text-sm">{m}: <b>{quetzales(c)}</b></div>)}
          {porMetodo.size === 0 && <div className="text-sm text-slate-400">—</div>}
        </div>
      </div>

      {porUsuario.size > 0 && (
        <p className="text-sm text-slate-600">
          Por cajero: {[...porUsuario].map(([u, c]) => `${u} ${quetzales(c)}`).join(" · ")}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Recibo</th><th className={th}>Hora</th><th className={th}>Alumno</th><th className={th}>Método</th><th className={th}>Ref.</th><th className={th}>Total</th><th className={th}>Cajero</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recibos.map((r) => (
              <tr key={r.id} className={r.estado === "ANULADO" ? "text-slate-400 line-through" : ""}>
                <td className={td}><Link href={`/admin/recibos/${r.id}`} className="text-blue-700">{numeroRecibo(r)}</Link></td>
                <td className={td}>{fechaHoraGT(r.fecha).slice(11)}</td>
                <td className={td}>{r.inscripcion.alumno.apellidos}, {r.inscripcion.alumno.nombres}</td>
                <td className={td}>{r.metodo}</td>
                <td className={td}>{r.referencia ?? ""}</td>
                <td className={td}>{quetzales(aCentavos(r.total))}</td>
                <td className={td}>{r.emitidoPor.nombre}</td>
              </tr>
            ))}
            {recibos.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin movimientos ese día.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Tip: usa Ctrl+P para imprimir el cierre.</p>
    </div>
  );
}
