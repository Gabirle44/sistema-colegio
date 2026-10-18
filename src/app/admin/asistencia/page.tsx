import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { td, th } from "@/lib/ui";

export default async function AsistenciaAdminPage() {
  await requireAdmin();
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  if (!ciclo) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay un ciclo escolar activo.</p>;

  const [asignaciones, inscritos] = await Promise.all([
    prisma.asignacionCurso.findMany({
      where: { seccion: { cicloId: ciclo.id } },
      include: { curso: true, maestro: true, seccion: { include: { grado: true } } },
      orderBy: [{ seccion: { grado: { orden: "asc" } } }, { seccion: { nombre: "asc" } }, { curso: { nombre: "asc" } }],
    }),
    prisma.inscripcion.groupBy({ by: ["seccionId"], where: { cicloId: ciclo.id, alumno: { activo: true } }, _count: { _all: true } }),
  ]);
  const alumnos = new Map(inscritos.map((i) => [i.seccionId, i._count._all]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Asistencia · Ciclo {ciclo.anio}</h1>
        <p className="text-sm text-slate-500">Elige un curso para tomar o revisar la asistencia, o para imprimir su lista.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Grado y sección</th><th className={th}>Curso</th><th className={th}>Maestro</th><th className={th}>Alumnos</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {asignaciones.map((a) => (
              <tr key={a.id}>
                <td className={td}>{a.seccion.grado.nombre} {a.seccion.nombre}</td>
                <td className={`${td} font-medium text-slate-800`}>{a.curso.nombre}</td>
                <td className={td}>{a.maestro.nombres} {a.maestro.apellidos}</td>
                <td className={td}>{alumnos.get(a.seccionId) ?? 0}</td>
                <td className={`${td} space-x-4 text-right whitespace-nowrap`}>
                  <Link href={`/admin/asistencia/${a.id}`} className="text-blue-700 hover:underline">Tomar / ver</Link>
                  <a href={`/admin/asistencia/${a.id}/pdf`} target="_blank" className="text-slate-600 hover:underline">Imprimir lista</a>
                </td>
              </tr>
            ))}
            {asignaciones.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay cursos asignados. Asígnalos en Académico.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
