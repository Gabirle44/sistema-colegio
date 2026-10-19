import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  // Consultamos métricas para darle dinamismo a las tarjetas
  const [totalGrados, totalSecciones, totalCursos, totalCiclos] = await Promise.all([
    prisma.grado.count(),
    prisma.seccion.count(),
    prisma.curso.count(),
    prisma.cicloEscolar.count(),
  ]);

  const modulos = [
    {
      paso: "01",
      titulo: "Ciclos Escolares",
      descripcion: "Configurar el año lectivo y estado activo.",
      href: "/admin/periodos",
      conteo: `${totalCiclos} registrado(s)`,
      colorBorder: "hover:border-indigo-500",
      colorTag: "bg-indigo-50 text-indigo-700",
      icono: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      paso: "02",
      titulo: "Grados",
      descripcion: "Crear y organizar los niveles académicos del colegio.",
      href: "/admin/grados",
      conteo: `${totalGrados} grado(s)`,
      colorBorder: "hover:border-blue-500",
      colorTag: "bg-blue-50 text-blue-700",
      icono: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      paso: "03",
      titulo: "Secciones",
      descripcion: "Asignar letras y divisiones agrupadas por grado.",
      href: "/admin/secciones",
      conteo: `${totalSecciones} sección(es)`,
      colorBorder: "hover:border-teal-500",
      colorTag: "bg-teal-50 text-teal-700",
      icono: (
        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      paso: "04",
      titulo: "Cursos",
      descripcion: "Gestionar las asignaturas del plan de estudios por grado.",
      href: "/admin/cursos",
      conteo: `${totalCursos} curso(s)`,
      colorBorder: "hover:border-purple-500",
      colorTag: "bg-purple-50 text-purple-700",
      icono: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Encabezado Principal */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Estructura Académica
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Panel de configuración para administrar los periodos, grados, secciones y materias del colegio.
        </p>
      </div>

      {/* Grid de Accesos Directos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modulos.map((item) => (
          <Link
            key={item.titulo}
            href={item.href}
            className={`group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md ${item.colorBorder} hover:-translate-y-0.5 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-blue-50 transition-colors">
                  {item.icono}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.colorTag}`}>
                  {item.conteo}
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                {item.titulo}
                <span className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-sm">
                  →
                </span>
              </h2>

              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {item.descripcion}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-medium text-slate-400">
              <span>Paso {item.paso} del Módulo</span>
              <span className="text-blue-600 group-hover:underline">Administrar</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}