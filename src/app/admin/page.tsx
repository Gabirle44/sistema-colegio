import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Panel de Administración</h1>
        <p className="text-slate-500 text-sm">Gestiona la estructura académica del colegio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/grados"
          className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Grados</h2>
          <p className="text-slate-600 text-sm">Crear y administrar grados académicos.</p>
        </Link>

        <Link
          href="/admin/secciones"
          className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Secciones</h2>
          <p className="text-slate-600 text-sm">Asignar secciones agrupadas por grado.</p>
        </Link>

        <Link
          href="/admin/cursos"
          className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Cursos</h2>
          <p className="text-slate-600 text-sm">Gestionar asignaturas por grado.</p>
        </Link>

        <Link
          href="/admin/periodos"
          className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Ciclos Escolares</h2>
          <p className="text-slate-600 text-sm">Configurar años lectivos.</p>
        </Link>
      </div>
    </div>
  );
}