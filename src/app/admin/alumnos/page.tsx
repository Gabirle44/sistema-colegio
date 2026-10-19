import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cambiarEstadoAlumno } from "./actions";

const POR_PAGINA = 10;

type SearchParams = Promise<{ q?: string; estado?: string; grado?: string; page?: string }>;

export default async function AlumnosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();

  const { q = "", estado = "activos", grado = "", page = "1" } = await searchParams;
  const termino = q.trim();
  const pagina = Math.max(1, Number.parseInt(page, 10) || 1);

  // El grado no se guarda en el alumno: sale de su inscripción en el ciclo activo
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  const grados = await prisma.grado.findMany({ orderBy: { orden: "asc" } });
  const gradoId = Number(grado) || undefined;

  const filtroGrado: Prisma.AlumnoWhereInput =
    !ciclo || !grado
      ? {}
      : grado === "sin"
        ? { inscripciones: { none: { cicloId: ciclo.id } } }
        : gradoId
          ? { inscripciones: { some: { cicloId: ciclo.id, seccion: { gradoId } } } }
          : {};

  const where: Prisma.AlumnoWhereInput = {
    ...filtroGrado,
    ...(termino
      ? {
          OR: [
            { carnet: { contains: termino, mode: "insensitive" } },
            { cui: { contains: termino } },
            { nombres: { contains: termino, mode: "insensitive" } },
            { apellidos: { contains: termino, mode: "insensitive" } },
            { encargadoNombre: { contains: termino, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(estado === "todos" ? {} : { activo: estado !== "inactivos" }),
  };

  const [total, alumnos] = await prisma.$transaction([
    prisma.alumno.count({ where }),
    prisma.alumno.findMany({
      where,
      include: {
        inscripciones: {
          where: ciclo ? { cicloId: ciclo.id } : { id: -1 },
          include: { seccion: { include: { grado: true } } },
        },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const enlace = (p: number) => {
    const params = new URLSearchParams();
    if (termino) params.set("q", termino);
    if (estado !== "activos") params.set("estado", estado);
    if (grado) params.set("grado", grado);
    params.set("page", String(p));
    return `/admin/alumnos?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Alumnos</h1>
        <Link
          href="/admin/alumnos/nuevo"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          + Nuevo alumno
        </Link>
      </div>

      <form className="flex flex-wrap gap-3" method="GET">
        <input
          name="q"
          defaultValue={termino}
          placeholder="Buscar por carnet, CUI, nombre o encargado"
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
        />
        <select
          name="grado"
          defaultValue={grado}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los grados</option>
          {grados.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
          <option value="sin">Sin inscribir{ciclo ? ` (${ciclo.anio})` : ""}</option>
        </select>
        <select
          name="estado"
          defaultValue={estado}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Carnet / CUI</th>
              <th className="px-4 py-3">Alumno</th>
              <th className="px-4 py-3">Grado {ciclo ? `(${ciclo.anio})` : ""}</th>
              <th className="px-4 py-3">Encargado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron alumnos.
                </td>
              </tr>
            )}
            {alumnos.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium tabular-nums">{a.carnet}</div>
                  <div className="text-xs text-slate-400 tabular-nums">{a.cui ?? "Sin CUI"}</div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    {a.apellidos}, {a.nombres}
                  </div>
                  <div className="text-xs text-slate-400">{a.telefono ?? "Sin teléfono"}</div>
                </td>
                <td className="px-4 py-3">
                  {a.inscripciones[0] ? (
                    <Link href={`/admin/cobros/${a.inscripciones[0].id}`} className="text-blue-700 hover:underline">
                      {a.inscripciones[0].seccion.grado.nombre} {a.inscripciones[0].seccion.nombre}
                    </Link>
                  ) : (
                    <span className="text-xs text-amber-700">Sin inscribir</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>{a.encargadoNombre}</div>
                  <div className="text-xs text-slate-400">
                    {[a.encargadoTelefono, a.encargadoCorreo].filter(Boolean).join(" · ") || "Sin contacto"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.activo ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {a.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/alumnos/${a.id}/editar`}
                      className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100"
                    >
                      Editar
                    </Link>
                    <form action={cambiarEstadoAlumno.bind(null, a.id, !a.activo)}>
                      <button className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100">
                        {a.activo ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {total} alumno{total === 1 ? "" : "s"} · Página {Math.min(pagina, totalPaginas)} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          {pagina > 1 && (
            <Link href={enlace(pagina - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100">
              ← Anterior
            </Link>
          )}
          {pagina < totalPaginas && (
            <Link href={enlace(pagina + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100">
              Siguiente →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
