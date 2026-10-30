import Link from "next/link";
import { notFound } from "next/navigation";
import BotonVolver from "@/components/BotonVolver";
import FormConAviso from "@/components/FormConAviso";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inputCls, tarjeta } from "@/lib/ui";
import { actualizarAdmin, alternarEstadoAdmin, cambiarPasswordAdmin } from "../actions";

export default async function AdminDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario || usuario.rol !== "ADMIN") notFound();

  return (
    <div className="space-y-6">
      <BotonVolver href="/admin/usuarios">Administradores</BotonVolver>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{usuario.nombre}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{usuario.email}</span>
              <span className={`rounded-full px-2.5 py-1 font-medium ${usuario.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {usuario.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
          <form action={alternarEstadoAdmin.bind(null, id)}>
            <button className={`rounded-lg border px-3 py-1.5 text-sm ${usuario.activo ? "border-red-200 text-red-700 hover:bg-red-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}>
              {usuario.activo ? "Desactivar" : "Reactivar"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={tarjeta}>
          <h2 className="mb-3 font-semibold text-slate-800">Datos del administrador</h2>
          <FormConAviso action={actualizarAdmin.bind(null, id)} etiqueta="Guardar cambios" limpiarSiOk={false}>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
                <input name="nombre" defaultValue={usuario.nombre} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Correo</label>
                <input name="email" type="email" defaultValue={usuario.email} className={inputCls} />
              </div>
            </div>
          </FormConAviso>
        </section>

        <section className={tarjeta}>
          <h2 className="mb-3 font-semibold text-slate-800">Restablecer contraseña</h2>
          <FormConAviso action={cambiarPasswordAdmin.bind(null, id)} etiqueta="Actualizar contraseña" limpiarSiOk={false}>
            <div className="space-y-3">
              <input name="password" type="password" autoComplete="new-password" className={inputCls} placeholder="Nueva contraseña" />
              <input name="confirmar" type="password" autoComplete="new-password" className={inputCls} placeholder="Confirma la contraseña" />
            </div>
          </FormConAviso>
        </section>
      </div>

      <Link href="/admin/usuarios" className="text-sm text-blue-700 hover:underline">← Volver a la lista</Link>
    </div>
  );
}
