import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { requireActor } from "@/lib/notas/acceso";
import { logout } from "../login/actions";

export default async function MaestroPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "MAESTRO") redirect("/login");
  const actor = await requireActor();

  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.userId } });
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  const asignaciones = ciclo && actor.maestroId
    ? await prisma.asignacionCurso.findMany({
        where: { maestroId: actor.maestroId, seccion: { cicloId: ciclo.id } },
        include: { curso: true, seccion: { include: { grado: true } } },
        orderBy: [{ seccion: { grado: { orden: "asc" } } }, { curso: { nombre: "asc" } }],
      })
    : [];
  const periodoAbierto = ciclo ? await prisma.periodo.findFirst({ where: { cicloId: ciclo.id, abierto: true }, orderBy: { numero: "asc" } }) : null;
  const alumnos = ciclo
    ? await prisma.inscripcion.groupBy({ by: ["seccionId"], where: { cicloId: ciclo.id, alumno: { activo: true } }, _count: { _all: true } })
    : [];
  const alumnosPor = new Map(alumnos.map((a) => [a.seccionId, a._count._all]));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel del maestro</h1>
          <p className="text-slate-500">Bienvenido, {usuario?.nombre}{ciclo && <> · Ciclo {ciclo.anio}</>}</p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">Cerrar sesión</button>
        </form>
      </header>

      <p className="mt-6 text-sm text-slate-600">
        Periodo abierto: <b>{periodoAbierto?.nombre ?? "ninguno (consulta solamente)"}</b>
      </p>
      <h2 className="mt-4 font-semibold text-slate-800">Mis cursos</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {asignaciones.map((a) => (
          <Link key={a.id} href={`/maestro/notas/${a.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-600">
            <div className="font-semibold text-slate-800">{a.curso.nombre}</div>
            <div className="text-sm text-slate-500">{a.seccion.grado.nombre} {a.seccion.nombre} · {alumnosPor.get(a.seccionId) ?? 0} alumnos</div>
            <div className="mt-2 text-sm text-blue-700">Ingresar notas →</div>
          </Link>
        ))}
        {asignaciones.length === 0 && (
          <p className="text-sm text-slate-500">Todavía no tienes cursos asignados en este ciclo. Pide al administrador que te los asigne.</p>
        )}
      </div>
    </main>
  );
}
