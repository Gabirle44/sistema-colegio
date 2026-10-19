import { requireAdmin } from "@/lib/auth";
import FormConAviso from "@/components/FormConAviso";
import BotonVolver from "@/components/BotonVolver";
import MaestroCampos from "@/components/admin/MaestroCampos";
import { inputCls, tarjeta } from "@/lib/ui";
import { crearMaestro } from "../actions";

export default async function NuevoMaestroPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl space-y-4">
      <BotonVolver href="/admin/maestros">Maestros</BotonVolver>
      <h1 className="text-2xl font-bold text-slate-800">Nuevo maestro</h1>
      <section className={tarjeta}>
        <FormConAviso action={crearMaestro} etiqueta="Crear maestro" etiquetaCargando="Creando..." limpiarSiOk={false}>
          <MaestroCampos />
          <h2 className="mb-2 mt-5 text-sm font-semibold text-slate-800">Contraseña inicial</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={inputCls} />
            <input name="confirmar" type="password" autoComplete="new-password" placeholder="Repite la contraseña" className={inputCls} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Se crea su usuario con rol Maestro. Después podrás asignarle cursos en Académico.
          </p>
        </FormConAviso>
      </section>
    </div>
  );
}
