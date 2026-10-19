import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Server Action para crear un curso
async function crearCurso(formData: FormData) {
  "use server";
  const gradoId = parseInt(formData.get("gradoId") as string);
  const nombre = formData.get("nombre") as string;

  if (gradoId && nombre) {
    await prisma.curso.create({
      data: {
        gradoId,
        nombre: nombre.toUpperCase().trim(),
      },
    });
    revalidatePath("/admin/cursos");
  }
}

// Server Action para eliminar un curso
async function eliminarCurso(formData: FormData) {
  "use server";
  const id = parseInt(formData.get("id") as string);
  if (id) {
    await prisma.curso.delete({
      where: { id },
    });
    revalidatePath("/admin/cursos");
  }
}

export default async function CursosPage() {
  // Consultamos los grados junto con sus cursos correspondientes
  const grados = await prisma.grado.findMany({
    orderBy: { orden: "asc" },
    include: {
      cursos: {
        orderBy: { nombre: "asc" },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Cursos</h1>
        <p className="text-slate-500 text-sm">
          Asigna las materias/asignaturas correspondientes a cada grado organizadas en tarjetas.
        </p>
      </div>

      {/* Formulario para agregar nuevo curso */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
        <h2 className="text-base font-semibold text-slate-700 mb-4">
          Agregar Nuevo Curso
        </h2>
        <form action={crearCurso} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Seleccionar Grado
            </label>
            <select
              name="gradoId"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Selecciona un grado --</option>
              {grados.map((grado) => (
                <option key={grado.id} value={grado.id}>
                  {grado.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nombre del Curso
            </label>
            <input
              type="text"
              name="nombre"
              required
              placeholder="Ej. Matemáticas, Idioma Español"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium text-sm h-[42px]"
          >
            Guardar
          </button>
        </form>
      </div>

      {/* Tarjetas paralelas agrupadas por Grado (1ro Básico, 2do Básico, 3ro Básico, etc.) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grados.map((grado) => (
          <div
            key={grado.id}
            className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Encabezado de la Tarjeta por Grado */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 text-base">{grado.nombre}</h2>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
                  {grado.cursos.length} Curso(s)
                </span>
              </div>

              {/* Lista de Cursos pertenecientes a este Grado */}
              <div className="p-4">
                {grado.cursos.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">
                    Sin cursos asignados
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {grado.cursos.map((curso) => (
                      <li
                        key={curso.id}
                        className="py-2.5 flex justify-between items-center text-sm"
                      >
                        <span className="font-semibold text-blue-600">
                          {curso.nombre}
                        </span>
                        <form action={eliminarCurso}>
                          <input type="hidden" name="id" value={curso.id} />
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