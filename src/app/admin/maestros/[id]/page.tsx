import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import FormConAviso from "@/components/FormConAviso";
import BotonVolver from "@/components/BotonVolver";
import MaestroCampos from "@/components/admin/MaestroCampos";
import { aCentavos, deCentavos, fechaGT, mayuscula, nombreMes, quetzales } from "@/lib/cobros/utils";
import { inputCls, tarjeta, td, th } from "@/lib/ui";
import { actualizarMaestro, alternarEstado, cambiarPassword } from "../actions";

export default async function MaestroPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const m = await prisma.maestro.findUnique({
    where: { id },
    include: {
      usuario: true,
      asignaciones: {
        include: { curso: true, seccion: { include: { grado: true, ciclo: true, _count: { select: { inscripciones: true } } } } },
        orderBy: [{ seccion: { ciclo: { anio: "desc" } } }, { seccion: { grado: { orden: "asc" } } }],
      },
      pagos: { orderBy: [{ anio: "desc" }, { mes: "desc" }] },
    },
  });
  if (!m) notFound();
  const totalPagado = m.pagos.reduce((s, p) => s + aCentavos(p.monto), 0);

  return (
    <div className="space-y-6">
      <BotonVolver href="/admin/maestros">Maestros</BotonVolver>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#15233b] text-lg font-bold text-amber-300">
              {m.nombres[0]?.toUpperCase()}{m.apellidos[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-slate-800">{m.apellidos}, {m.nombres}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{m.usuario?.email ?? "Sin usuario"}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">Salario {quetzales(aCentavos(m.salarioMensual))}</span>
                <span className={`rounded-full px-2.5 py-1 font-medium ${m.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {m.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>
          <form action={alternarEstado.bind(null, id)}>
            <button className={`rounded-lg border px-3 py-1.5 text-sm ${m.activo ? "border-red-200 text-red-700 hover:bg-red-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}>
              {m.activo ? "Desactivar" : "Reactivar"}
            </button>
          </form>
        </div>
        {!m.activo && <p className="mt-3 text-sm text-slate-500">Inactivo: no puede iniciar sesión ni aparece al asignar cursos o pagar.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${tarjeta} lg:col-span-2`}>
          <h2 className="mb-3 font-semibold text-slate-800">Datos</h2>
          <FormConAviso action={actualizarMaestro.bind(null, id)} etiqueta="Guardar cambios" limpiarSiOk={false}>
            <MaestroCampos v={{
              nombres: m.nombres, apellidos: m.apellidos, email: m.usuario?.email, telefono: m.telefono,
              salario: deCentavos(aCentavos(m.salarioMensual)),
            }} />
          </FormConAviso>
        </section>

        <section className={tarjeta}>
          <h2 className="mb-3 font-semibold text-slate-800">Restablecer contraseña</h2>
          {m.usuarioId ? (
            <FormConAviso action={cambiarPassword.bind(null, id)} etiqueta="Cambiar contraseña">
              <div className="space-y-3">
                <input name="password" type="password" autoComplete="new-password" placeholder="Nueva contraseña" className={inputCls} />
                <input name="confirmar" type="password" autoComplete="new-password" placeholder="Repítela" className={inputCls} />
              </div>
            </FormConAviso>
          ) : (
            <p className="text-sm text-slate-400">Este maestro no tiene usuario.</p>
          )}
        </section>
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-semibold text-slate-800">Cursos asignados</h2>
          <Link href="/admin/academico?tab=secciones" className="text-sm text-blue-700 hover:underline">Asignar en Académico</Link>
        </div>
        <table className="mt-2 w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Ciclo</th><th className={th}>Grado y sección</th><th className={th}>Curso</th><th className={th}>Alumnos</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {m.asignaciones.map((a) => (
              <tr key={a.id}>
                <td className={td}>{a.seccion.ciclo.anio}</td>
                <td className={td}>{a.seccion.grado.nombre} {a.seccion.nombre}</td>
                <td className={td}>{a.curso.nombre}</td>
                <td className={td}>{a.seccion._count.inscripciones}</td>
                <td className={`${td} text-right`}>
                  <Link href={`/admin/notas/${a.id}`} className="text-blue-700 hover:underline">Ver notas</Link>
                </td>
              </tr>
            ))}
            {m.asignaciones.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin cursos asignados.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-semibold text-slate-800">Pagos recibidos</h2>
          <span className="text-sm text-slate-500">Total: <b className="text-slate-800">{quetzales(totalPagado)}</b></span>
        </div>
        <table className="mt-2 w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className={th}>Periodo</th><th className={th}>Fecha</th><th className={th}>Monto</th><th className={th}>Observaciones</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {m.pagos.map((p) => (
              <tr key={p.id}>
                <td className={td}>{mayuscula(nombreMes(p.mes))} {p.anio}</td>
                <td className={td}>{fechaGT(p.fecha)}</td>
                <td className={td}>{quetzales(aCentavos(p.monto))}</td>
                <td className={td}>{p.observaciones ?? "—"}</td>
                <td className={`${td} text-right`}>
                  <a href={`/admin/pagos-maestros/${p.id}/pdf`} target="_blank" className="text-blue-700 hover:underline">Comprobante</a>
                </td>
              </tr>
            ))}
            {m.pagos.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Aún no tiene pagos.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
