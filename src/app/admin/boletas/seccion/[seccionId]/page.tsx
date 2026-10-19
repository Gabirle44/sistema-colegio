import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cargarBoletas, estaRetenida } from "@/lib/notas/boleta";
import { etiquetaResultado, fmtNota, promedio } from "@/lib/notas/calculo";
import { quetzales } from "@/lib/cobros/utils";
import { tarjeta, td, th } from "@/lib/ui";
import BotonVolver from "@/components/BotonVolver";

const colorRes = { APROBADO: "text-green-700", REPROBADO: "text-red-600", EN_PROCESO: "text-slate-500" } as const;

export default async function SeccionBoletasPage({ params }: { params: Promise<{ seccionId: string }> }) {
  await requireAdmin();
  const seccionId = Number((await params).seccionId);
  if (!Number.isInteger(seccionId)) notFound();
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId }, include: { grado: true, ciclo: true } });
  if (!seccion) notFound();
  const ins = await prisma.inscripcion.findMany({
    where: { seccionId, cicloId: seccion.cicloId, alumno: { activo: true } },
    orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
    select: { id: true },
  });
  const { boletas, ajustes } = await cargarBoletas(ins.map((i) => i.id));
  const cursos = boletas[0]?.cursos ?? [];
  const retenidas = boletas.filter((b) => estaRetenida(b, ajustes));

  // Estadísticas por curso
  const statsCurso = cursos.map((c, idx) => {
    const proms = boletas.map((b) => b.cursos[idx].promedio);
    const completos = boletas.filter((b) => b.cursos[idx].resultado !== "EN_PROCESO");
    const aprob = completos.filter((b) => b.cursos[idx].resultado === "APROBADO").length;
    return { prom: promedio(proms), aprob, total: completos.length };
  });

  const honor = [...boletas]
    .filter((b) => b.promedioGeneral !== null && b.resultado !== "REPROBADO")
    .sort((a, b) => (b.promedioGeneral! - a.promedioGeneral!))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BotonVolver href="/admin/boletas">Boletas</BotonVolver>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{seccion.grado.nombre} {seccion.nombre} · Cuadro de notas</h1>
          <p className="text-sm text-slate-500">Ciclo {seccion.ciclo.anio} · Nota mínima: {ajustes.notaMinima}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={`/admin/boletas/seccion/${seccionId}/pdf`} target="_blank" className="rounded-lg bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800">Todas las boletas (PDF)</a>
          <a href={`/admin/boletas/seccion/${seccionId}/csv`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100">Exportar CSV (Excel)</a>
        </div>
      </div>

      {retenidas.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {retenidas.length} boleta(s) retenida(s) por saldo vencido: no salen en el PDF de toda la sección.{" "}
          <a href={`/admin/boletas/seccion/${seccionId}/pdf?incluirMorosos=1`} target="_blank" className="underline">Generarlas todas igual</a>
        </p>
      )}

      {honor.length > 0 && (
        <div className={tarjeta}>
          <h2 className="mb-2 font-semibold text-slate-800">🏅 Cuadro de honor</h2>
          <ol className="space-y-1 text-sm">
            {honor.map((h, i) => (
              <li key={h.inscripcionId}>{i + 1}. {h.alumno.nombre} — <b>{fmtNota(h.promedioGeneral)}</b></li>
            ))}
          </ol>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Alumno</th>
              {cursos.map((c) => <th key={c.cursoId} className={`${th} text-center`}>{c.nombre}</th>)}
              <th className={`${th} text-center`}>Promedio</th><th className={th}>Resultado</th><th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {boletas.map((b) => {
              const retenida = estaRetenida(b, ajustes);
              return (
                <tr key={b.inscripcionId}>
                  <td className={td}>
                    <div className="font-medium text-slate-800">{b.alumno.nombre}</div>
                    <div className="text-xs text-slate-500">{b.alumno.carnet}</div>
                  </td>
                  {b.cursos.map((c) => (
                    <td key={c.cursoId} className={`${td} text-center ${c.resultado === "REPROBADO" ? "font-medium text-red-600" : ""}`}>{fmtNota(c.promedio)}</td>
                  ))}
                  <td className={`${td} text-center font-bold`}>{fmtNota(b.promedioGeneral)}</td>
                  <td className={`${td} ${colorRes[b.resultado]}`}>{etiquetaResultado[b.resultado]}</td>
                  <td className={`${td} space-x-3 text-right`}>
                    {retenida && <span title={`Debe ${quetzales(b.saldoVencido)}`} className="text-amber-700">⛔ mora</span>}
                    <Link href={`/admin/boletas/${b.inscripcionId}`} className="text-blue-700 hover:underline">Detalle</Link>
                  </td>
                </tr>
              );
            })}
            {boletas.length === 0 && <tr><td colSpan={cursos.length + 4} className="px-4 py-8 text-center text-slate-400">No hay alumnos inscritos.</td></tr>}
          </tbody>
          {boletas.length > 0 && (
            <tfoot className="bg-slate-50 text-slate-600">
              <tr>
                <td className={`${td} font-medium`}>Promedio del curso</td>
                {statsCurso.map((s, i) => <td key={i} className={`${td} text-center font-medium`}>{fmtNota(s.prom)}</td>)}
                <td className={td} colSpan={3} />
              </tr>
              <tr>
                <td className={`${td} font-medium`}>Aprobación</td>
                {statsCurso.map((s, i) => <td key={i} className={`${td} text-center text-xs`}>{s.total ? `${s.aprob}/${s.total} (${Math.round((s.aprob / s.total) * 100)}%)` : "—"}</td>)}
                <td className={td} colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
