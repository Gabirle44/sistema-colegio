import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FormConAviso from "@/components/FormConAviso";
import { cargarBoletas, estaRetenida } from "@/lib/notas/boleta";
import { CONDUCTAS, etiquetaResultado, fmtNota } from "@/lib/notas/calculo";
import { guardarBoletaPeriodo } from "@/lib/notas/actions";
import { enlaceWhatsApp, quetzales } from "@/lib/cobros/utils";
import { inputCls, tarjeta, td, th } from "@/lib/ui";
import BotonVolver from "@/components/BotonVolver";

export default async function BoletaDetallePage({ params }: { params: Promise<{ inscripcionId: string }> }) {
  await requireAdmin();
  const id = Number((await params).inscripcionId);
  if (!Number.isInteger(id)) notFound();
  const { boletas, ajustes } = await cargarBoletas([id]);
  const b = boletas[0];
  if (!b) notFound();
  const ins = await prisma.inscripcion.findUnique({ where: { id }, select: { seccionId: true } });
  const retenida = estaRetenida(b, ajustes);

  const mensaje = `Estimado(a) ${b.alumno.encargado}, del ${ajustes.nombreColegio}: la boleta de ${b.alumno.nombre} está lista. Promedio general: ${fmtNota(b.promedioGeneral)} (${etiquetaResultado[b.resultado]}).`;
  const wa = retenida ? null : enlaceWhatsApp(b.alumno.telefono, mensaje);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BotonVolver href={ins ? `/admin/boletas/seccion/${ins.seccionId}` : "/admin/boletas"}>Cuadro de notas</BotonVolver>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{b.alumno.nombre}</h1>
          <p className="text-sm text-slate-500">Carnet {b.alumno.carnet} · {b.grado} {b.seccion} · Ciclo {b.ciclo}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <a href={`/admin/boletas/${id}/pdf`} target="_blank" className="rounded-lg bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800">Boleta PDF</a>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">Avisar por WhatsApp</a>}
        </div>
      </div>

      {retenida && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ⛔ Boleta retenida: tiene {b.cuotasVencidas} cuota(s) vencida(s) por {quetzales(b.saldoVencido)}.{" "}
          <Link href={`/admin/cobros/${id}`} className="underline">Ver estado de cuenta</Link> ·{" "}
          <a href={`/admin/boletas/${id}/pdf?autorizar=1`} target="_blank" className="underline">Autorizar entrega</a>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Curso</th>
              {b.periodos.map((p) => <th key={p.id} className={`${th} text-center`}>{p.nombre}</th>)}
              <th className={`${th} text-center`}>Promedio</th><th className={th}>Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {b.cursos.map((c) => (
              <tr key={c.cursoId}>
                <td className={td}>{c.nombre}</td>
                {c.notas.map((n, i) => (
                  <td key={i} className={`${td} text-center ${n !== null && n < ajustes.notaMinima ? "text-red-600" : ""}`}>{fmtNota(n)}</td>
                ))}
                <td className={`${td} text-center font-bold`}>{fmtNota(c.promedio)}</td>
                <td className={`${td} ${c.resultado === "REPROBADO" ? "text-red-600" : c.resultado === "APROBADO" ? "text-green-700" : "text-slate-500"}`}>{etiquetaResultado[c.resultado]}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td className={`${td} font-semibold`}>Promedio general</td>
              <td className={`${td} text-center font-bold`} colSpan={b.periodos.length + 1}>{fmtNota(b.promedioGeneral)}</td>
              <td className={`${td} font-semibold`}>{etiquetaResultado[b.resultado]}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-800">Conducta, asistencia y comentarios</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {b.periodos.map((p, i) => {
            const d = b.datosPeriodo[i];
            return (
              <div key={p.id} className={tarjeta}>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">{p.nombre}</h3>
                <FormConAviso action={guardarBoletaPeriodo.bind(null, id, p.id)} etiqueta="Guardar" limpiarSiOk={false}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">Inasistencias</label>
                      <input name="inasistencias" defaultValue={d.inasistencias} inputMode="numeric" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Conducta</label>
                      <select name="conducta" defaultValue={d.conducta ?? ""} className={inputCls}>
                        <option value="">—</option>
                        {CONDUCTAS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea name="comentario" defaultValue={d.comentario ?? ""} rows={2} placeholder="Comentario para el encargado (opcional)" className={`${inputCls} mt-3`} />
                </FormConAviso>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
