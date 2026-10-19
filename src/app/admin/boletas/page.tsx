import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cargarBoletas } from "@/lib/notas/boleta";
import { fmtNota, promedio } from "@/lib/notas/calculo";
import { td, th } from "@/lib/ui";

export default async function BoletasPage() {
  await requireAdmin();
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  if (!ciclo) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay un ciclo escolar activo.</p>;
  const secciones = await prisma.seccion.findMany({
    where: { cicloId: ciclo.id },
    include: { grado: true, inscripciones: { where: { alumno: { activo: true } }, select: { id: true } } },
    orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
  });
  const todas = secciones.flatMap((s) => s.inscripciones.map((i) => i.id));
  const { boletas } = await cargarBoletas(todas);
  const porInscripcion = new Map(boletas.map((b) => [b.inscripcionId, b]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Boletas · Ciclo {ciclo.anio}</h1>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Grado y sección</th><th className={th}>Alumnos</th><th className={th}>Promedio</th><th className={th}>Reprobando</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {secciones.map((s) => {
              const bs = s.inscripciones.map((i) => porInscripcion.get(i.id)).filter((b): b is NonNullable<typeof b> => !!b);
              const prom = promedio(bs.map((b) => b.promedioGeneral));
              const repro = bs.filter((b) => b.resultado === "REPROBADO").length;
              return (
                <tr key={s.id}>
                  <td className={td}>{s.grado.nombre} {s.nombre}</td>
                  <td className={td}>{bs.length}</td>
                  <td className={td}>{fmtNota(prom)}</td>
                  <td className={`${td} ${repro ? "font-medium text-red-600" : ""}`}>{repro}</td>
                  <td className={td}><Link href={`/admin/boletas/seccion/${s.id}`} className="text-blue-700 hover:underline">Cuadro de notas</Link></td>
                </tr>
              );
            })}
            {secciones.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay secciones en el ciclo activo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
