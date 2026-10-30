import BotonVolver from "@/components/BotonVolver";
import FormConAviso from "@/components/FormConAviso";
import { requireAdmin } from "@/lib/auth";
import { inputCls, tarjeta } from "@/lib/ui";
import { crearAdmin } from "../actions";

export default async function NuevoAdminPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BotonVolver href="/admin/usuarios">Administradores</BotonVolver>
      <h1 className="text-2xl font-bold text-slate-800">Nuevo administrador</h1>
      <section className={tarjeta}>
        <FormConAviso action={crearAdmin} etiqueta="Crear administrador" etiquetaCargando="Creando..." limpiarSiOk={false}>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nombre completo</label>
              <input name="nombre" autoComplete="name" className={inputCls} placeholder="Ej. Ana López" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Correo</label>
              <input name="email" type="email" autoComplete="email" className={inputCls} placeholder="admin@colegio.test" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Contraseña inicial</label>
                <input name="password" type="password" autoComplete="new-password" className={inputCls} placeholder="Mínimo 8 caracteres" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Confirmar contraseña</label>
                <input name="confirmar" type="password" autoComplete="new-password" className={inputCls} placeholder="Repite la contraseña" />
              </div>
            </div>
          </div>
        </FormConAviso>
      </section>
    </div>
  );
}
