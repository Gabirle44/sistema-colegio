import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import FormConAviso from "@/components/FormConAviso";
import { inputCls, tarjeta } from "@/lib/ui";
import {
  activarCiclo, asignarMaestro, crearCiclo, crearCurso, crearGrado, crearSeccion,
  eliminarCurso, eliminarGrado, eliminarSeccion, quitarAsignacion,
} from "./actions";

const mini = "text-xs text-red-600 hover:underline";

export default async function AcademicoPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const tab = (await searchParams).tab === "grados" ? "grados" : (await searchParams).tab === "secciones" ? "secciones" : "ciclos";
  const [ciclos, grados, maestros] = await Promise.all([
    prisma.cicloEscolar.findMany({ orderBy: { anio: "desc" }, include: { _count: { select: { inscripciones: true, secciones: true } } } }),
    prisma.grado.findMany({
      orderBy: { orden: "asc" },
      include: {
        cursos: { orderBy: { nombre: "asc" }, include: { _count: { select: { asignaciones: true, notas: true } } } },
        _count: { select: { secciones: true, cursos: true } },
      },
    }),
    prisma.maestro.findMany({ where: { activo: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
  ]);
  const activo = ciclos.find((c) => c.activo) ?? null;
  const secciones = activo
    ? await prisma.seccion.findMany({
        where: { cicloId: activo.id },
        include: { grado: true, _count: { select: { inscripciones: true } }, asignaciones: { include: { curso: true, maestro: true }, orderBy: { curso: { nombre: "asc" } } } },
        orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
      })
    : [];
  const cursos = grados.flatMap((g) => g.cursos.map((c) => ({ id: c.id, texto: `${g.nombre} · ${c.nombre}` })));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Estructura académica</h1>
        <p className="text-sm text-slate-500">Ciclos, grados, secciones, cursos y maestros asignados.</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-slate-200 text-sm" aria-label="Secciones de la página">
        {([["ciclos", "Ciclos"], ["grados", "Grados y cursos"], ["secciones", "Secciones y maestros"]] as const).map(([k, t]) => (
          <Link key={k} href={`/admin/academico?tab=${k}`} aria-current={tab === k ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 ${tab === k ? "border-blue-700 font-semibold text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t}
          </Link>
        ))}
      </nav>

      {/* Ciclos */}
      {tab === "ciclos" && (
      <section className={tarjeta}>
        <h2 className="mb-3 font-semibold text-slate-800">Ciclos escolares</h2>
        <div className="flex flex-wrap gap-3">
          {ciclos.map((c) => (
            <div key={c.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${c.activo ? "border-green-600 bg-green-50" : "border-slate-200"}`}>
              <div>
                <div className="font-semibold">{c.anio} {c.activo && <span className="text-green-700">· activo</span>}</div>
                <div className="text-xs text-slate-500">{c._count.secciones} {c._count.secciones === 1 ? "sección" : "secciones"} · {c._count.inscripciones} {c._count.inscripciones === 1 ? "inscrito" : "inscritos"}</div>
              </div>
              {!c.activo && (
                <form action={activarCiclo.bind(null, c.id)}>
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Activar</button>
                </form>
              )}
            </div>
          ))}
          {ciclos.length === 0 && <p className="text-sm text-slate-500">No hay ciclos todavía.</p>}
        </div>
        <div className="mt-4 max-w-md border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Crear ciclo nuevo</h3>
          <FormConAviso action={crearCiclo} etiqueta="Crear ciclo">
            <input name="anio" placeholder="Año (ej. 2027)" inputMode="numeric" className={inputCls} />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="copiar" defaultChecked /> Copiar secciones y periodos del ciclo activo</label>
            <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" name="copiarMaestros" defaultChecked /> Copiar también los maestros asignados</label>
          </FormConAviso>
          <p className="mt-2 text-xs text-slate-500">Al activar un ciclo nuevo, el anterior queda como historial. Luego usa Promoción para pasar a los alumnos.</p>
        </div>
      </section>
      )}

      {tab === "grados" && (
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grados */}
        <section className={tarjeta}>
          <h2 className="mb-3 font-semibold text-slate-800">Grados</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {grados.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2">
                <span><span className="mr-2 text-xs text-slate-400">{g.orden}</span>{g.nombre}</span>
                {g._count.secciones === 0 && g._count.cursos === 0 && (
                  <form action={eliminarGrado.bind(null, g.id)}><button className={mini}>Eliminar</button></form>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <FormConAviso action={crearGrado} etiqueta="Agregar grado">
              <div className="grid grid-cols-3 gap-2">
                <input name="nombre" placeholder="Nombre (ej. Segundo Básico)" className={`${inputCls} col-span-2`} />
                <input name="orden" placeholder="Orden" inputMode="numeric" className={inputCls} />
              </div>
              <p className="mt-1 text-xs text-slate-500">El orden define la secuencia (1, 2, 3...). Si lo dejas vacío va al final.</p>
            </FormConAviso>
          </div>
        </section>

        {/* Cursos */}
        <section className={tarjeta}>
          <h2 className="mb-3 font-semibold text-slate-800">Cursos por grado</h2>
          <div className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {grados.map((g) => (
              <div key={g.id}>
                <div className="font-medium text-slate-700">{g.nombre}</div>
                <ul className="ml-3 text-slate-600">
                  {g.cursos.map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span>{c.nombre}</span>
                      {c._count.asignaciones === 0 && c._count.notas === 0 && (
                        <form action={eliminarCurso.bind(null, c.id)}><button className={mini}>Eliminar</button></form>
                      )}
                    </li>
                  ))}
                  {g.cursos.length === 0 && <li className="text-xs text-slate-400">Sin cursos</li>}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <FormConAviso action={crearCurso} etiqueta="Agregar curso">
              <div className="grid grid-cols-2 gap-2">
                <select name="gradoId" defaultValue="" className={inputCls}>
                  <option value="" disabled>Grado...</option>
                  {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
                <input name="nombre" placeholder="Curso (ej. Matemática)" className={inputCls} />
              </div>
            </FormConAviso>
          </div>
        </section>
      </div>
      )}

      {/* Secciones y maestros */}
      {tab === "secciones" && (
      <section className={tarjeta}>
        <h2 className="mb-3 font-semibold text-slate-800">Secciones y maestros {activo ? `· Ciclo ${activo.anio}` : ""}</h2>
        {!activo && <p className="text-sm text-amber-700">Activa un ciclo para administrar sus secciones.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {secciones.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">{s.grado.nombre} {s.nombre} <span className="font-normal text-slate-400">· {s._count.inscripciones} {s._count.inscripciones === 1 ? "alumno" : "alumnos"}</span></div>
                {s._count.inscripciones === 0 && (
                  <form action={eliminarSeccion.bind(null, s.id)}><button className={mini}>Eliminar</button></form>
                )}
              </div>
              <ul className="mt-2 space-y-1 text-slate-600">
                {s.asignaciones.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <span>{a.curso.nombre}: <b>{a.maestro.nombres} {a.maestro.apellidos}</b></span>
                    <form action={quitarAsignacion.bind(null, a.id)}><button className={mini}>Quitar</button></form>
                  </li>
                ))}
                {s.asignaciones.length === 0 && <li className="text-xs text-slate-400">Sin cursos asignados</li>}
              </ul>
            </div>
          ))}
        </div>

        {activo && (
          <div className="mt-4 grid gap-6 border-t border-slate-100 pt-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Agregar sección</h3>
              <FormConAviso action={crearSeccion} etiqueta="Agregar sección">
                <div className="grid grid-cols-2 gap-2">
                  <select name="gradoId" defaultValue="" className={inputCls}>
                    <option value="" disabled>Grado...</option>
                    {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                  <input name="nombre" placeholder="Sección (ej. A)" className={inputCls} />
                </div>
              </FormConAviso>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Asignar maestro a un curso</h3>
              <FormConAviso action={asignarMaestro} etiqueta="Asignar">
                <div className="space-y-2">
                  <select name="seccionId" defaultValue="" className={inputCls}>
                    <option value="" disabled>Sección...</option>
                    {secciones.map((s) => <option key={s.id} value={s.id}>{s.grado.nombre} {s.nombre}</option>)}
                  </select>
                  <select name="cursoId" defaultValue="" className={inputCls}>
                    <option value="" disabled>Curso...</option>
                    {cursos.map((c) => <option key={c.id} value={c.id}>{c.texto}</option>)}
                  </select>
                  <select name="maestroId" defaultValue="" className={inputCls}>
                    <option value="" disabled>Maestro...</option>
                    {maestros.map((m) => <option key={m.id} value={m.id}>{m.apellidos}, {m.nombres}</option>)}
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500">Si el curso ya tenía maestro en esa sección, se reemplaza.</p>
              </FormConAviso>
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
