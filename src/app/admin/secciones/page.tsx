import { prisma } from "@/lib/prisma";
import { crearSeccion, eliminarSeccion } from "./actions";

export default async function SeccionesPage() {
  const gradosConSecciones = await prisma.grado.findMany({
    orderBy: { orden: "asc" },
    include: {
      secciones: {
        include: { ciclo: true },
        orderBy: { nombre: "asc" },
      },
    },
  });

  const cicloActivo =
    (await prisma.cicloEscolar.findFirst({ where: { activo: true } })) ||
    (await prisma.cicloEscolar.findFirst({ orderBy: { anio: "desc" } }));

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Secciones</h1>
        <p className="text-slate-500 text-sm">
          Asigna secciones (A, B, C...) organizadas por tarjetas de grado.
        </p>
      </div>

      {!cicloActivo ? (
        <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md mb-6">
          <strong>Aviso:</strong> No hay ciclos escolares registrados. Debes crear al menos uno antes de registrar secciones.
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">
            Agregar Nueva Sección (Ciclo {cicloActivo.anio})
          </h2>
          <form action={crearSeccion} className="flex flex-col sm:flex-row gap-4 items-end">
            <input type="hidden" name="cicloId" value={cicloActivo.id} />

            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Seleccionar Grado
              </label>
              <select
                name="gradoId"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              >
                <option value="">-- Selecciona un grado --</option>
                {gradosConSecciones.map((grado) => (
                  <option key={grado.id} value={grado.id}>
                    {grado.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sección / Letra
              </label>
              <input
                type="text"
                name="nombre"
                required
                placeholder="Ej. A, B o Única"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      )}

      {/* Tarjetas distribuidas en columnas de lado a lado (1, 2, 3...) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gradosConSecciones.map((grado) => (
          <div
            key={grado.id}
            className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 text-base">{grado.nombre}</h2>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  {grado.secciones.length} Sección(es)
                </span>
              </div>

              <div className="p-4">
                {grado.secciones.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">
                    Sin secciones asignadas
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {grado.secciones.map((sec) => (
                      <li
                        key={sec.id}
                        className="py-2 flex justify-between items-center text-sm"
                      >
                        <div>
                          <span className="font-semibold text-blue-600">
                            Sección {sec.nombre}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            ({sec.ciclo?.anio})
                          </span>
                        </div>
                        <form action={eliminarSeccion}>
                          <input type="hidden" name="id" value={sec.id} />
                          <button
                            type="submit"
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}