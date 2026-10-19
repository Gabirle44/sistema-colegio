import { requireAdmin } from "@/lib/auth";
import { isoHoyGT } from "@/lib/cobros/utils";
import { inputCls, tarjeta } from "@/lib/ui";

export default async function ReportesPage() {
  await requireAdmin();
  const hoy = isoHoyGT();
  const inicioMes = `${hoy.slice(0, 8)}01`;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
      <p className="text-sm text-slate-500">Se descargan como CSV; ábrelos directo con Excel.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={tarjeta}>
          <h2 className="font-semibold">Ingresos / recibos</h2>
          <form action="/admin/reportes/export" className="mt-3 space-y-3">
            <input type="hidden" name="tipo" value="recibos" />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500">Desde</label><input type="date" name="desde" defaultValue={inicioMes} className={inputCls} /></div>
              <div><label className="text-xs text-slate-500">Hasta</label><input type="date" name="hasta" defaultValue={hoy} className={inputCls} /></div>
            </div>
            <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">Descargar recibos</button>
          </form>
        </section>
        <section className={tarjeta}>
          <h2 className="font-semibold">Ingresos por mes</h2>
          <form action="/admin/reportes/export" className="mt-3 space-y-3">
            <input type="hidden" name="tipo" value="ingresos" />
            <p className="text-sm text-slate-500">Total cobrado por mes y método (recibos vigentes).</p>
            <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">Descargar resumen</button>
          </form>
        </section>
        <section className={tarjeta}>
          <h2 className="font-semibold">Morosos</h2>
          <form action="/admin/reportes/export" className="mt-3 space-y-3">
            <input type="hidden" name="tipo" value="morosos" />
            <p className="text-sm text-slate-500">Alumnos con cuotas vencidas, con teléfono del encargado.</p>
            <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">Descargar morosos</button>
          </form>
        </section>
        <section className={tarjeta}>
          <h2 className="font-semibold">Estado de cuentas</h2>
          <form action="/admin/reportes/export" className="mt-3 space-y-3">
            <input type="hidden" name="tipo" value="saldos" />
            <p className="text-sm text-slate-500">Saldo y pagado de todos los alumnos inscritos.</p>
            <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">Descargar saldos</button>
          </form>
        </section>
      </div>
    </div>
  );
}
