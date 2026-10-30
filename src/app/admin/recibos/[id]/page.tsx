import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { aCentavos, fechaHoraGT, numeroRecibo, quetzales } from "@/lib/cobros/utils";
import { montoALetras } from "@/lib/cobros/letras";
import { inputCls, tarjeta, td, th } from "@/lib/ui";
import FormConAviso from "@/components/FormConAviso";
import { anularRecibo } from "../actions";
import BotonVolver from "@/components/BotonVolver";

export default async function ReciboPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const r = await prisma.recibo.findUnique({
    where: { id },
    include: {
      emitidoPor: true, anuladoPor: true,
      detalles: { include: { cargo: true }, orderBy: { id: "asc" } },
      inscripcion: { include: { alumno: true } },
    },
  });
  if (!r) notFound();
  const a = r.inscripcion.alumno;
  const total = aCentavos(r.total);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <BotonVolver href={`/admin/cobros/${r.inscripcionId}`}>Estado de cuenta</BotonVolver>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-800">
            Recibo {numeroRecibo(r)}
            {r.estado === "ANULADO" && <span className="ml-3 rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">ANULADO</span>}
          </h1>
          <div className="flex gap-2 text-sm">
            <a href={`/admin/recibos/${id}/pdf`} target="_blank" className="rounded-lg bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800">Ver / imprimir PDF</a>
            <a href={`/admin/recibos/${id}/pdf?descargar=1`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100">Descargar</a>
          </div>
        </div>
      </div>

      <div className={tarjeta}>
        <p className="text-sm text-slate-600">
          <b>{a.apellidos}, {a.nombres}</b> (Carnet {a.carnet}) · {fechaHoraGT(r.fecha)} · Emitido por {r.emitidoPor.nombre}
        </p>
        <p className="text-sm text-slate-600">
          Pago: {r.metodo}{r.referencia && <> · Boleta/Ref.: {r.referencia}</>}{r.observaciones && <> · {r.observaciones}</>}
        </p>
        <table className="mt-4 w-full text-sm">
          <thead className="text-slate-500"><tr><th className={th}>Concepto</th><th className={`${th} text-right`}>Monto</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {r.detalles.map((d) => (
              <tr key={d.id}><td className={td}>{d.cargo.descripcion}</td><td className={`${td} text-right`}>{quetzales(aCentavos(d.monto))}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-right text-lg font-bold">Total: {quetzales(total)}</p>
        <p className="text-right text-xs text-slate-500">{montoALetras(total)}</p>
      </div>

      {r.estado === "ANULADO" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Anulado el {r.anuladoEn && fechaHoraGT(r.anuladoEn)} por {r.anuladoPor?.nombre}. Motivo: {r.motivoAnulacion}
        </div>
      ) : (
        <section className={tarjeta}>
          <h2 className="mb-1 font-semibold text-slate-800">Anular recibo</h2>
          <p className="mb-3 text-xs text-slate-500">El recibo no se borra: queda marcado como anulado y las cuotas vuelven a quedar pendientes.</p>
          <FormConAviso
            action={anularRecibo.bind(null, id)} etiqueta="Anular recibo" limpiarSiOk={false}
            confirmar="¿Seguro que quieres anular este recibo? No se puede deshacer."
            botonClase="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            <input name="motivo" placeholder="Motivo de la anulación" className={inputCls} />
          </FormConAviso>
        </section>
      )}
    </div>
  );
}
