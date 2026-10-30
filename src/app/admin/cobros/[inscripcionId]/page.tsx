import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { resumenCuenta, saldoCentavos } from "@/lib/cobros/cargos";
import { aCentavos, enlaceWhatsApp, esVencido, fechaCorta, fechaGT, isoHoyGT, numeroRecibo, quetzales } from "@/lib/cobros/utils";
import { inputCls, tarjeta, td, th } from "@/lib/ui";
import FormConAviso from "@/components/FormConAviso";
import PagoForm from "./PagoForm";
import { anularCargo, aplicarDescuento, crearCargoExtra } from "../actions";
import { cambiarSeccion } from "./cambiarSeccion";
import BotonVolver from "@/components/BotonVolver";

const colorEstado: Record<string, string> = {
  PENDIENTE: "bg-slate-100 text-slate-700",
  PARCIAL: "bg-amber-100 text-amber-800",
  PAGADO: "bg-green-100 text-green-800",
  ANULADO: "bg-red-100 text-red-700",
};

export default async function EstadoCuentaPage({ params }: { params: Promise<{ inscripcionId: string }> }) {
  await requireAdmin();
  const id = Number((await params).inscripcionId);
  if (!Number.isInteger(id)) notFound();

  const ins = await prisma.inscripcion.findUnique({
    where: { id },
    include: {
      alumno: true,
      ciclo: true,
      seccion: { include: { grado: true } },
      cargos: { orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }] },
      recibos: { orderBy: { id: "desc" }, include: { emitidoPor: true } },
    },
  });
  if (!ins) notFound();
  const cfg = await obtenerConfig();
  const hermanas = await prisma.seccion.findMany({
    where: { cicloId: ins.cicloId, gradoId: ins.seccion.gradoId, NOT: { id: ins.seccionId } },
    orderBy: { nombre: "asc" },
  });
  const r = resumenCuenta(ins.cargos, cfg.diasGracia);
  const a = ins.alumno;

  const pendientes = ins.cargos
    .filter((c) => (c.estado === "PENDIENTE" || c.estado === "PARCIAL") && saldoCentavos(c) > 0)
    .map((c) => ({
      id: c.id, descripcion: c.descripcion, saldo: saldoCentavos(c), concepto: c.concepto,
      vencido: esVencido(c.fechaVencimiento, cfg.diasGracia), vence: fechaCorta(c.fechaVencimiento),
    }));

  const mensaje = r.vencido > 0
    ? `Estimado(a) ${a.encargadoNombre}, del ${cfg.nombreColegio}: le recordamos que ${a.nombres} ${a.apellidos} tiene ${r.cuotasVencidas} cuota(s) vencida(s) por ${quetzales(r.vencido)}. Agradecemos su pronto pago.`
    : `Estimado(a) ${a.encargadoNombre}, del ${cfg.nombreColegio}: ${a.nombres} ${a.apellidos} se encuentra solvente. ¡Gracias!`;
  const wa = enlaceWhatsApp(a.encargadoTelefono ?? a.telefono, mensaje);
  const hoyIso = isoHoyGT();

  return (
    <div className="space-y-6">
      <div>
        <BotonVolver href="/admin/cobros">Cobros</BotonVolver>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#15233b] text-lg font-bold text-amber-300">
              {(a.nombres[0] ?? "").toUpperCase()}{(a.apellidos[0] ?? "").toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-slate-800">{a.apellidos}, {a.nombres}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">Carnet {a.carnet}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">{ins.seccion.grado.nombre} {ins.seccion.nombre}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">Ciclo {ins.ciclo.anio}</span>
                {ins.motivoDescuento && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">Descuento: {ins.motivoDescuento}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">Encargado: <span className="text-slate-700">{a.encargadoNombre}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={`/admin/cobros/${id}/solvencia`} target="_blank" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100">
              Constancia / estado PDF
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total del ciclo", quetzales(r.cargado - r.descuentos), "text-slate-800"],
          ["Pagado", quetzales(r.pagado), "text-green-700"],
          ["Saldo", quetzales(r.saldo), "text-slate-800"],
          ["Vencido", quetzales(r.vencido), r.vencido > 0 ? "text-red-600" : "text-green-700"],
        ].map(([t, v, c]) => (
          <div key={t} className={tarjeta}>
            <div className="text-xs text-slate-500">{t}</div>
            <div className={`text-xl font-bold ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <section className={tarjeta}>
        <h2 className="mb-3 font-semibold text-slate-800">Registrar pago</h2>
        <PagoForm inscripcionId={id} cargos={pendientes} recargoMora={aCentavos(cfg.recargoMora)} />
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <h2 className="px-4 pt-4 font-semibold text-slate-800">Cargos</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Concepto</th><th className={th}>Vence</th><th className={th}>Monto</th>
              <th className={th}>Desc.</th><th className={th}>Pagado</th><th className={th}>Saldo</th><th className={th}>Estado</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ins.cargos.map((c) => (
              <tr key={c.id} className={c.estado === "ANULADO" ? "opacity-50" : ""}>
                <td className={td}>{c.descripcion}</td>
                <td className={td}>{fechaCorta(c.fechaVencimiento)}</td>
                <td className={td}>{quetzales(aCentavos(c.monto))}</td>
                <td className={td}>{aCentavos(c.descuento) ? quetzales(aCentavos(c.descuento)) : "—"}</td>
                <td className={td}>{quetzales(aCentavos(c.pagado))}</td>
                <td className={td}>{c.estado === "ANULADO" ? "—" : quetzales(Math.max(0, saldoCentavos(c)))}</td>
                <td className={td}><span className={`rounded-full px-2 py-0.5 text-xs ${colorEstado[c.estado]}`}>{c.estado}</span></td>
                <td className={td}>
                  {(c.concepto === "OTRO" || c.concepto === "RECARGO") && c.estado === "PENDIENTE" && aCentavos(c.pagado) === 0 && (
                    <form action={anularCargo.bind(null, c.id, id)}>
                      <button className="text-xs text-red-600 hover:underline">Anular</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={tarjeta}>
        <h2 className="mb-1 font-semibold text-slate-800">Cambiar de sección</h2>
        <p className="mb-3 text-sm text-slate-500">
          Ahora está en {ins.seccion.grado.nombre} {ins.seccion.nombre}. Los cobros y las notas se conservan.
        </p>
        {hermanas.length === 0 ? (
          <p className="text-sm text-slate-400">Este grado no tiene otras secciones en el ciclo {ins.ciclo.anio}. Créalas en Académico.</p>
        ) : (
          <FormConAviso action={cambiarSeccion.bind(null, id)} etiqueta="Cambiar sección" limpiarSiOk={false}
            confirmar="¿Cambiar al alumno de sección?">
            <select name="seccionId" defaultValue="" className={inputCls}>
              <option value="" disabled>Elige la nueva sección…</option>
              {hermanas.map((h) => <option key={h.id} value={h.id}>{ins.seccion.grado.nombre} {h.nombre}</option>)}
            </select>
          </FormConAviso>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={tarjeta}>
          <h2 className="mb-3 font-semibold text-slate-800">Otro cobro (uniforme, libros, excursión...)</h2>
          <FormConAviso action={crearCargoExtra.bind(null, id)} etiqueta="Agregar cobro">
            <div className="space-y-3">
              <input name="descripcion" placeholder="Descripción" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input name="monto" placeholder="Monto (Q)" inputMode="decimal" className={inputCls} />
                <input name="vencimiento" type="date" defaultValue={hoyIso} className={inputCls} />
              </div>
            </div>
          </FormConAviso>
        </section>

        <section className={tarjeta}>
          <h2 className="mb-3 font-semibold text-slate-800">Beca / descuento</h2>
          <p className="mb-2 text-xs text-slate-500">Descuento fijo por cuota. Se aplica a las cuotas que aún no tienen pagos.</p>
          <FormConAviso action={aplicarDescuento.bind(null, id)} etiqueta="Aplicar descuento" limpiarSiOk={false}>
            <div className="space-y-3">
              <select name="tipo" className={inputCls} defaultValue="MENSUALIDAD">
                <option value="MENSUALIDAD">Mensualidades</option>
                <option value="INSCRIPCION">Inscripción</option>
              </select>
              <input name="monto" placeholder="Descuento por cuota (Q)" inputMode="decimal" className={inputCls} />
              <input name="motivo" placeholder="Motivo (ej. Beca 50%)" defaultValue={ins.motivoDescuento ?? ""} className={inputCls} />
            </div>
          </FormConAviso>
        </section>
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <h2 className="px-4 pt-4 font-semibold text-slate-800">Recibos</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>No.</th><th className={th}>Fecha</th><th className={th}>Total</th><th className={th}>Método</th><th className={th}>Estado</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ins.recibos.map((rc) => (
              <tr key={rc.id} className={rc.estado === "ANULADO" ? "text-slate-400 line-through" : ""}>
                <td className={td}>{numeroRecibo(rc)}</td>
                <td className={td}>{fechaGT(rc.fecha)}</td>
                <td className={td}>{quetzales(aCentavos(rc.total))}</td>
                <td className={td}>{rc.metodo}</td>
                <td className={td}>{rc.estado}</td>
                <td className={td}><Link href={`/admin/recibos/${rc.id}`} className="text-blue-700 hover:underline no-underline">Ver</Link></td>
              </tr>
            ))}
            {ins.recibos.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Aún no hay recibos.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
