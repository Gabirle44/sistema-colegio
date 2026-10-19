import { prisma } from "@/lib/prisma";
import { crearCiclo } from "./actions";

export default async function PeriodosPage() {
  const ciclos = await prisma.cicloEscolar.findMany({
    orderBy: { anio: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ciclos Escolares</h1>
        <p className="text-slate-500 text-sm">Gestiona los años lectivos del colegio.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Nuevo Ciclo Escolar</h2>
        <form action={crearCiclo} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Año Lectivo
            </label>
            <input
              type="number"
              name="anio"
              defaultValue={new Date().getFullYear()}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition font-medium"
          >
            Crear Ciclo
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Año</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ciclos.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-slate-500 text-sm">
                  No hay ciclos creados.
                </td>
              </tr>
            ) : (
              ciclos.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 text-sm text-slate-900">{c.id}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{c.anio}</td>
                  <td className="px-6 py-4 text-sm">
                    {c.activo ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}