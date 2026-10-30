import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { enlaceWhatsApp } from "@/lib/cobros/utils";
import BotonVolver from "@/components/BotonVolver";
import FotoAlumno from "@/components/FotoAlumno";
import { fmtNota, promedio } from "@/lib/notas/calculo";

export default async function AlumnoDetallePage({ params }: { params: Promise<{ inscripcionId: string }> }) {
  const actor = await requireActor();
  const inscripcionId = Number((await params).inscripcionId);
  if (!Number.isInteger(inscripcionId)) notFound();

  const inscripcion = await prisma.inscripcion.findUnique({
    where: { id: inscripcionId },
    include: {
      alumno: true,
      seccion: { include: { grado: true, ciclo: true, asignaciones: { include: { curso: true } } } },
      notas: { include: { curso: true, periodo: true } },
      asistencias: { include: { asignacion: { include: { curso: true } } } },
    },
  });
  if (!inscripcion) notFound();

  if (actor.rol === "MAESTRO") {
    const pertenece = inscripcion.seccion.asignaciones.some((a) => a.maestroId === actor.maestroId);
    if (!pertenece) redirect("/maestro");
  }

  const tieneFoto = (await prisma.alumnoFoto.findUnique({ where: { alumnoId: inscripcion.alumnoId }, select: { alumnoId: true } })) !== null;

  const periodos = await prisma.periodo.findMany({
    where: { cicloId: inscripcion.seccion.cicloId },
    orderBy: { numero: "asc" },
  });
  const asignaciones = inscripcion.seccion.asignaciones.filter((a) => actor.rol === "ADMIN" || a.maestroId === actor.maestroId);
  const wa = enlaceWhatsApp(inscripcion.alumno.encargadoTelefono ?? inscripcion.alumno.telefono, `Estimado(a) ${inscripcion.alumno.encargadoNombre}, le compartimos la información del alumno ${inscripcion.alumno.nombres} ${inscripcion.alumno.apellidos}.`);

  const presentes = inscripcion.asistencias.filter((a) => a.estado === "PRESENTE").length;
  const ausentes = inscripcion.asistencias.filter((a) => a.estado === "AUSENTE").length;
  const totalAsistencias = inscripcion.asistencias.length;
  const porcentaje = totalAsistencias === 0 ? 0 : Math.round((presentes / totalAsistencias) * 100);

  return (
    <div className="space-y-6">
      <BotonVolver href="/maestro">Volver</BotonVolver>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <FotoAlumno alumnoId={inscripcion.alumnoId} tieneFoto={tieneFoto} nombre={`${inscripcion.alumno.nombres} ${inscripcion.alumno.apellidos}`} tamano={72} />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{inscripcion.alumno.nombres} {inscripcion.alumno.apellidos}</h1>
              <p className="mt-1 text-sm text-slate-500">Carné {inscripcion.alumno.carnet} · {inscripcion.seccion.grado.nombre} {inscripcion.seccion.nombre}</p>
            </div>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Datos del alumno</h2>
          <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Nombre</dt>
              <dd className="font-medium text-slate-900">{inscripcion.alumno.nombres} {inscripcion.alumno.apellidos}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Carné</dt>
              <dd className="font-medium text-slate-900">{inscripcion.alumno.carnet}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Grado</dt>
              <dd className="font-medium text-slate-900">{inscripcion.seccion.grado.nombre}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Sección</dt>
              <dd className="font-medium text-slate-900">{inscripcion.seccion.nombre}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Contacto del encargado</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <div><span className="text-slate-500">Nombre:</span> {inscripcion.alumno.encargadoNombre}</div>
            <div><span className="text-slate-500">Teléfono:</span> {inscripcion.alumno.encargadoTelefono ?? inscripcion.alumno.telefono ?? "Sin teléfono"}</div>
            {inscripcion.alumno.encargadoCorreo && <div><span className="text-slate-500">Correo:</span> {inscripcion.alumno.encargadoCorreo}</div>}
          </div>
        </section>
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="px-4 py-3 font-semibold text-slate-800">Notas por periodo</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Curso</th>
              {periodos.map((p) => <th key={p.id} className="px-4 py-3 text-center">{p.nombre}</th>)}
              <th className="px-4 py-3 text-center">Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {asignaciones.map((a) => {
              const notas = periodos.map((p) => inscripcion.notas.find((n) => n.cursoId === a.cursoId && n.periodoId === p.id));
              const valores = notas.map((n) => (n ? Number(n.valor) : null)).filter((n): n is number => n !== null);
              const media = valores.length ? promedio(valores) : null;
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.curso.nombre}</td>
                  {notas.map((n, idx) => (
                    <td key={`${a.id}-${periodos[idx].id}`} className="px-4 py-3 text-center">
                      {n ? <span className={Number(n.valor) < 60 ? "text-red-600" : "text-slate-700"}>{fmtNota(Number(n.valor))}</span> : "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-semibold">{fmtNota(media)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Asistencia</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-green-50 p-3">
            <div className="text-xs uppercase tracking-wide text-green-700">Presentes</div>
            <div className="mt-1 text-2xl font-bold text-green-800">{presentes}</div>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <div className="text-xs uppercase tracking-wide text-red-700">Ausentes</div>
            <div className="mt-1 text-2xl font-bold text-red-800">{ausentes}</div>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <div className="text-xs uppercase tracking-wide text-blue-700">Porcentaje</div>
            <div className="mt-1 text-2xl font-bold text-blue-800">{porcentaje}%</div>
          </div>
        </div>
      </section>
    </div>
  );
}
