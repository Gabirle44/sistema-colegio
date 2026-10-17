import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { resumenCuenta } from "@/lib/cobros/cargos";
import { quetzales } from "@/lib/cobros/utils";
import { btnPrimario, td, th } from "@/lib/ui";

type SP = Promise<{ q?: string }>;

export default async function CobrosPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const termino = q.trim();
  const cfg = await obtenerConfig();
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });

  const inscripciones = ciclo
    ? await prisma.inscripcion.findMany({
        where: {
          cicloId: ciclo.id,
          ...(termino
            ? {
                alumno: {
                  OR: [
                    { carnet: { contains: termino, mode: "insensitive" } },
                    { nombres: { contains: termino, mode: "insensitive" } },
                    { apellidos: { contains: termino, mode: "insensitive" } },
                  ],
                },
              }
            : {}),
        },
        include: { alumno: true, seccion: { include: { grado: true } }, cargos: true },
        orderBy: { alumno: { apellidos: "asc" } },
        take: 100,
      })
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Cobros {ciclo ? `· Ciclo ${ciclo.anio}` : ""}</h1>
        <Link href="/admin/inscripciones/nueva" className={btnPrimario}>Nueva inscripción</Link>
      </div>
      {!ciclo && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay un ciclo escolar activo.</p>
      )}
      <form className="mt-4 flex gap-2">
        <input
          name="q" defaultValue={termino} placeholder="Buscar por carnet o nombre..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg border border-slate-300 bg-white px-4 text-sm hover:bg-slate-100">Buscar</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Alumno</th><th className={th}>Grado</th>
              <th className={th}>Saldo</th><th className={th}>Vencido</th><th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inscripciones.map((i) => {
              const r = resumenCuenta(i.cargos, cfg.diasGracia);
              return (
                <tr key={i.id}>
                  <td className={td}>
                    <div className="font-medium text-slate-800">{i.alumno.apellidos}, {i.alumno.nombres}</div>
                    <div className="text-xs text-slate-500">{i.alumno.carnet}</div>
                  </td>
                  <td className={td}>{i.seccion.grado.nombre} {i.seccion.nombre}</td>
                  <td className={td}>{quetzales(r.saldo)}</td>
                  <td className={td}>
                    {r.vencido > 0
                      ? <span className="font-medium text-red-600">{quetzales(r.vencido)} ({r.cuotasVencidas})</span>
                      : <span className="text-green-700">Al día</span>}
                  </td>
                  <td className={`${td} text-right`}>
                    <Link href={`/admin/cobros/${i.id}`} className="text-blue-700 hover:underline">Estado de cuenta</Link>
                  </td>
                </tr>
              );
            })}
            {inscripciones.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Sin inscripciones.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
