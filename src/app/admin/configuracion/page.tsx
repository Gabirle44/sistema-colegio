import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { inputCls } from "@/lib/ui";
import FormConAviso from "@/components/FormConAviso";
import { guardarConfiguracion } from "./actions";

export default async function ConfiguracionPage() {
  await requireAdmin();
  const c = await obtenerConfig();
  const campo = (etiqueta: string, nombre: string, valor: string | number, ayuda?: string) => (
    <div>
      <label className="text-sm font-medium text-slate-700">{etiqueta}</label>
      <input name={nombre} defaultValue={valor} className={inputCls} />
      {ayuda && <p className="text-xs text-slate-400">{ayuda}</p>}
    </div>
  );
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
      <p className="mb-4 text-sm text-slate-500">Los cambios de cuotas aplican a inscripciones nuevas; los datos del colegio salen en recibos y constancias.</p>
      <FormConAviso action={guardarConfiguracion} etiqueta="Guardar" limpiarSiOk={false} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("Nombre del colegio", "nombreColegio", c.nombreColegio)}
          {campo("Serie de recibos", "serieRecibo", c.serieRecibo, "Ej. A")}
          {campo("Dirección", "direccion", c.direccion)}
          {campo("Teléfono", "telefono", c.telefono)}
          {campo("Mensualidades por ciclo", "cantidadMensualidades", c.cantidadMensualidades, "Ej. 10 (enero a octubre)")}
          {campo("Mes de la primera mensualidad", "mesInicio", c.mesInicio, "1 = enero")}
          {campo("Día de vencimiento", "diaVencimiento", c.diaVencimiento, "1 a 28")}
          {campo("Días de gracia", "diasGracia", c.diasGracia, "Antes de considerarse moroso")}
          {campo("Recargo por mora (Q)", "recargoMora", Number(c.recargoMora).toFixed(2), "0 = sin recargo. Se cobra por mensualidad vencida, si la caja lo marca.")}
        </div>
      </FormConAviso>
    </div>
  );
}
