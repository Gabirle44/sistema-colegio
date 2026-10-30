import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { aCentavos, fechaGT, hoyGT, mayuscula, MESES, nombreMes, quetzales } from "@/lib/cobros/utils";
import { tarjeta } from "@/lib/ui";
import FormRegistroPagoMaestro from "./FormRegistroPagoMaestro";
import { eliminarPagoMaestro } from "./actions";

type SP = Promise<{ mes?: string; anio?: string }>;

export default async function PagosMaestrosPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const hoy = hoyGT();
  const mesN = Number(sp.mes);
  const anioN = Number(sp.anio);
  const mes = Number.isInteger(mesN) && mesN >= 1 && mesN <= 12 ? mesN : hoy.getUTCMonth() + 1;
  const anio = Number.isInteger(anioN) && anioN >= 2000 && anioN <= 2100 ? anioN : hoy.getUTCFullYear();

  const [maestros, pagos] = await Promise.all([
    prisma.maestro.findMany({ where: { activo: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    prisma.pagoMaestro.findMany({ where: { mes, anio } }),
  ]);
  const porMaestro = new Map(pagos.map((p) => [p.maestroId, p]));
  const planilla = maestros.reduce((s, m) => s + aCentavos(m.salarioMensual), 0);
  const pagado = pagos.reduce((s, p) => s + aCentavos(p.monto), 0);
  const pendientes = maestros.filter((m) => !porMaestro.has(m.id));
  const pendiente = pendientes.reduce((s, m) => s + aCentavos(m.salarioMensual), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pagos a maestros</h1>
        <p className="text-sm text-slate-500">Planilla de {mayuscula(nombreMes(mes))} {anio}</p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Mes</span>
          <select name="mes" defaultValue={mes} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {MESES.map((n, i) => <option key={n} value={i + 1}>{mayuscula(n)}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Año</span>
          <input name="anio" type="number" defaultValue={anio} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100">Ver</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Planilla del mes", quetzales(planilla), "text-slate-800"],
          ["Pagado", quetzales(pagado), "text-green-700"],
          ["Pendiente", quetzales(pendiente), pendiente > 0 ? "text-amber-700" : "text-green-700"],
        ].map(([t, v, c]) => (
          <div key={t} className={tarjeta}>
            <div className="text-xs text-slate-500">{t}</div>
            <div className={`text-xl font-bold ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {maestros.map((m) => {
          const p = porMaestro.get(m.id);
          return (
            <div key={m.id} className={tarjeta}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/admin/maestros/${m.id}`} className="font-medium text-slate-800 hover:underline">
                    {m.apellidos}, {m.nombres}
                  </Link>
                  <div className="text-xs text-slate-500">Salario {quetzales(aCentavos(m.salarioMensual))}</div>
                </div>
                {p ? (
                  <div className="flex flex-col sm:items-end gap-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Líquido pagado {quetzales(aCentavos(p.monto))} · {fechaGT(p.fecha)}
                      </span>
                      <a href={`/admin/pagos-maestros/${p.id}/pdf`} target="_blank" className="text-blue-700 hover:underline text-xs font-medium">
                        Ver Comprobante
                      </a>
                      <form action={eliminarPagoMaestro.bind(null, p.id)}>
                        <button className="text-xs text-red-600 hover:underline">Eliminar</button>
                      </form>
                    </div>
                    {aCentavos(p.sueldoBase) > 0 && (
                      <div className="text-[11px] text-slate-500">
                        Base: {quetzales(aCentavos(p.sueldoBase))} | Bono: {quetzales(aCentavos(p.bonificacion))} | IGSS: -{quetzales(aCentavos(p.igss))}
                        {aCentavos(p.horasExtra) > 0 && ` | Extra: +${quetzales(aCentavos(p.horasExtra))}`}
                        {aCentavos(p.descuentos) > 0 && ` | Desc: -${quetzales(aCentavos(p.descuentos))}`}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Pendiente</span>
                )}
              </div>
              {!p && (
                <FormRegistroPagoMaestro
                  maestroId={m.id}
                  maestroNombre={`${m.nombres} ${m.apellidos}`}
                  salarioBaseCentavos={aCentavos(m.salarioMensual)}
                  mes={mes}
                  anio={anio}
                />
              )}
            </div>
          );
        })}
        {maestros.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            No hay maestros activos. <Link href="/admin/maestros/nuevo" className="text-blue-700 hover:underline">Crea el primero</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
