import Link from "next/link";

const modulos = [
  { nombre: "Alumnos", href: "/admin/alumnos", detalle: "Registro, búsqueda y estado de alumnos" },
  { nombre: "Cobros", href: "/admin/cobros", detalle: "Inscripciones, estados de cuenta y pagos" },
  { nombre: "Recibos", href: "/admin/recibos", detalle: "Historial, PDF y anulaciones" },
  { nombre: "Notas", href: "/admin/notas", detalle: "Periodos, avance por curso y corrección de notas" },
  { nombre: "Boletas", href: "/admin/boletas", detalle: "Cuadro de notas, boletas PDF y cuadro de honor" },
  { nombre: "Morosos", href: "/admin/morosos", detalle: "Cuotas vencidas y recordatorios por WhatsApp" },
  { nombre: "Cierre de caja", href: "/admin/caja", detalle: "Ingresos del día por método y cajero" },
  { nombre: "Reportes", href: "/admin/reportes", detalle: "Exportar a Excel (CSV)" },
  { nombre: "Configuración", href: "/admin/configuracion", detalle: "Cuotas, vencimientos, mora y datos del colegio" },
  { nombre: "Bitácora", href: "/admin/bitacora", detalle: "Auditoría de movimientos" },

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
