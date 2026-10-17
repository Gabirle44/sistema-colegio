import Link from "next/link";

const modulos = [
  { nombre: "Alumnos", href: "/admin/alumnos", detalle: "Registro, búsqueda y estado de alumnos" },
  { nombre: "Inscripciones y cobros", href: null, detalle: "Próximamente" },
  { nombre: "Pagos y recibos", href: null, detalle: "Próximamente" },
  { nombre: "Notas y boletas", href: null, detalle: "Próximamente" },
];

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Panel del administrador</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {modulos.map((m) =>
          m.href ? (
            <Link
              key={m.nombre}
              href={m.href}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-600"
            >
              <h2 className="font-semibold text-slate-800">{m.nombre}</h2>
              <p className="mt-1 text-sm text-slate-500">{m.detalle}</p>
            </Link>
          ) : (
            <div key={m.nombre} className="rounded-xl border border-dashed border-slate-300 p-5 opacity-60">
              <h2 className="font-semibold text-slate-700">{m.nombre}</h2>
              <p className="mt-1 text-sm text-slate-500">{m.detalle}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
