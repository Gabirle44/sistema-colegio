import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import FormConAviso from "@/components/FormConAviso";
import { alternarPeriodo, crearPeriodo, periodosEstandar } from "@/lib/notas/actions";
import { inputCls, tarjeta, td, th } from "@/lib/ui";

export default async function NotasAdminPage() {
  await requireAdmin();
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  if (!ciclo) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay un ciclo escolar activo.</p>;

  const [periodos, asignaciones, notas, inscritos] = await Promise.all([
    prisma.periodo.findMany({ where: { cicloId: ciclo.id }, orderBy: { numero: "asc" } }),
    prisma.asignacionCurso.findMany({
      where: { seccion: { cicloId: ciclo.id } },
      include: { curso: true, maestro: true, seccion: { include: { grado: true } } },
      orderBy: [{ seccion: { grado: { orden: "asc" } } }, { seccion: { nombre: "asc" } }, { curso: { nombre: "asc" } }],
    }),
    prisma.nota.findMany({
      where: { periodo: { cicloId: ciclo.id } },
      select: { cursoId: true, periodoId: true, inscripcion: { select: { seccionId: true } } },
    }),
    prisma.inscripcion.groupBy({ by: ["seccionId"], where: { cicloId: ciclo.id, alumno: { activo: true } }, _count: { _all: true } }),
  ]);

  const alumnosPorSeccion = new Map(inscritos.map((i) => [i.seccionId, i._count._all]));
  const conteo = new Map<string, number>();
  for (const n of notas) {
    const k = `${n.inscripcion.seccionId}|${n.cursoId}|${n.periodoId}`;
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Notas · Ciclo {ciclo.anio}</h1>

      <section className={tarjeta}>
        <h2 className="mb-3 font-semibold text-slate-800">Periodos</h2>
        {periodos.length === 0 ? (
          <form action={periodosEstandar}>
            <p className="mb-2 text-sm text-slate-600">Aún no hay periodos en este ciclo.</p>
            <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">Crear 4 bimestres</button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-3">
            {periodos.map((p) => (
              <form key={p.id} action={alternarPeriodo.bind(null, p.id)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium">{p.nombre}</span>
                <span className={p.abierto ? "text-green-700" : "text-red-600"}>{p.abierto ? "Abierto" : "Cerrado"}</span>
                <button className="rounded-md border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100">{p.abierto ? "Cerrar" : "Reabrir"}</button>
              </form>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">Con el periodo cerrado, los maestros ya no pueden cambiar notas (el administrador sí).</p>
        <div className="mt-4 max-w-sm">
          <FormConAviso action={crearPeriodo} etiqueta="Agregar periodo">
            <input name="nombre" placeholder="Nombre (ej. Bimestre V, Recuperación)" className={inputCls} />
          </FormConAviso>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <h2 className="px-4 pt-4 font-semibold text-slate-800">Cursos y avance de notas</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Grado</th><th className={th}>Curso</th><th className={th}>Maestro</th>
              {periodos.map((p) => <th key={p.id} className={th}>{p.nombre}</th>)}<th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {asignaciones.map((a) => {
              const total = alumnosPorSeccion.get(a.seccionId) ?? 0;
              return (
                <tr key={a.id}>
                  <td className={td}>{a.seccion.grado.nombre} {a.seccion.nombre}</td>
                  <td className={td}>{a.curso.nombre}</td>
                  <td className={td}>{a.maestro.nombres} {a.maestro.apellidos}</td>
                  {periodos.map((p) => {
                    const c = conteo.get(`${a.seccionId}|${a.cursoId}|${p.id}`) ?? 0;
                    return (
                      <td key={p.id} className={`${td} ${total > 0 && c >= total ? "text-green-700" : c === 0 ? "text-slate-400" : "text-amber-700"}`}>
                        {c}/{total}
                      </td>
                    );
                  })}
                  <td className={td}><Link href={`/admin/notas/${a.id}`} className="text-blue-700 hover:underline">Ver / editar</Link></td>
                </tr>
              );
            })}
            {asignaciones.length === 0 && (
              <tr><td colSpan={4 + periodos.length} className="px-4 py-8 text-center text-slate-400">No hay cursos asignados a maestros en este ciclo.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
