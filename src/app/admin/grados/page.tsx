import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { crearGrado, eliminarGrado } from "./actions";

export default async function GradosPage() {
  const grados = await prisma.grado.findMany({
    orderBy: { orden: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Volver al Panel
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Grados</h1>
        </div>
      </div>

      {/* Formulario para agregar nuevo grado */}
      <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Agregar Nuevo Grado</h2>
        <form action={crearGrado} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Grado
            </label>
            <input
              type="text"
              name="nombre"
              required
              placeholder="Ej. Primero Básico"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Orden
            </label>
            <input
              type="number"
              name="orden"
              defaultValue={1}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition font-medium"
          >
            Guardar
          </button>
        </form>
      </div>

      {/* Tabla de grados */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre del Grado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Orden
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {grados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No hay grados registrados.
                </td>
              </tr>
            ) : (
              grados.map((grado) => (
                <tr key={grado.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{grado.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {grado.nombre}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{grado.orden}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <form action={eliminarGrado} className="inline-block">
                      <input type="hidden" name="id" value={grado.id} />
                      <button
                        type="submit"
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Eliminar
                      </button>
                    </form>
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