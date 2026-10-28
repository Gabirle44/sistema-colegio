"use client";

import { useMemo, useState } from "react";
import FormConAviso from "@/components/FormConAviso";
import { deCentavos, parseCentavos, quetzales } from "@/lib/cobros/utils";
import {
  BONIFICACION_INCENTIVO_LEY_CENTAVOS,
  calcularPlanillaMaestro,
} from "@/lib/maestros/planilla";
import { inputCls, btnPrimario } from "@/lib/ui";
import { registrarPagoMaestro } from "./actions";

interface Props {
  maestroId: number;
  maestroNombre: string;
  salarioBaseCentavos: number;
  mes: number;
  anio: number;
}

export default function FormRegistroPagoMaestro({
  maestroId,
  maestroNombre,
  salarioBaseCentavos,
  mes,
  anio,
}: Props) {
  const [sueldoBase, setSueldoBase] = useState(deCentavos(salarioBaseCentavos));
  const [bonificacion, setBonificacion] = useState(deCentavos(BONIFICACION_INCENTIVO_LEY_CENTAVOS));
  const [horasExtra, setHorasExtra] = useState("0.00");
  const [descuentos, setDescuentos] = useState("0.00");
  const [abierto, setAbierto] = useState(false);

  // Cálculo en tiempo real del desglose de planilla en centavos
  const desglose = useMemo(() => {
    const sb = parseCentavos(sueldoBase) ?? 0;
    const b = parseCentavos(bonificacion, { vacioEsCero: true }) ?? 0;
    const he = parseCentavos(horasExtra, { vacioEsCero: true }) ?? 0;
    const d = parseCentavos(descuentos, { vacioEsCero: true }) ?? 0;

    return calcularPlanillaMaestro({
      sueldoBaseCentavos: sb,
      bonificacionCentavos: b,
      horasExtraCentavos: he,
      descuentosCentavos: d,
    });
  }, [sueldoBase, bonificacion, horasExtra, descuentos]);

  const accionVinculada = registrarPagoMaestro.bind(null, maestroId, mes, anio);

  if (!abierto) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
        >
          + Preparar pago de planilla
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Desglose de Planilla para {maestroNombre}
        </span>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancelar
        </button>
      </div>

      <FormConAviso
        action={accionVinculada}
        etiqueta={`Registrar pago (${quetzales(desglose.liquidoCentavos)})`}
        etiquetaCargando="Registrando pago..."
        limpiarSiOk={false}
        confirmar={`¿Confirmas el pago a ${maestroNombre} con un líquido de ${quetzales(desglose.liquidoCentavos)}?`}
        botonClase={`${btnPrimario} w-full sm:w-auto mt-2`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Sueldo Base */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Sueldo Base (Q)</label>
            <input
              name="sueldoBase"
              value={sueldoBase}
              onChange={(e) => setSueldoBase(e.target.value)}
              inputMode="decimal"
              required
              className={inputCls}
            />
          </div>

          {/* Bonificación Incentivo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Bono Incentivo (Q) <span className="text-[10px] text-slate-400 font-normal">(No IGSS)</span>
            </label>
            <input
              name="bonificacion"
              value={bonificacion}
              onChange={(e) => setBonificacion(e.target.value)}
              inputMode="decimal"
              className={inputCls}
            />
          </div>

          {/* Horas Extra */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Horas Extra (Q) <span className="text-[10px] text-slate-400 font-normal">(Afectas)</span>
            </label>
            <input
              name="horasExtra"
              value={horasExtra}
              onChange={(e) => setHorasExtra(e.target.value)}
              inputMode="decimal"
              className={inputCls}
            />
          </div>

          {/* Anticipos y Descuentos */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Anticipos / Descuentos (Q)</label>
            <input
              name="descuentos"
              value={descuentos}
              onChange={(e) => setDescuentos(e.target.value)}
              inputMode="decimal"
              className={inputCls}
            />
          </div>

          {/* Observaciones */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-1">
            <label className="text-xs font-medium text-slate-600">Observaciones (opcional)</label>
            <input
              name="observaciones"
              placeholder="Detalle de horas extra, bono extraordinario o motivo de descuento"
              className={inputCls}
            />
          </div>
        </div>

        {/* Resumen dinámico del cálculo en vivo */}
        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200/80 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Total Ingresos:</span>
              <span className="font-semibold text-slate-800">
                {quetzales(desglose.totalIngresosCentavos)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Cuota Laboral IGSS (4.83%):</span>
              <span className="font-semibold text-rose-700">
                -{quetzales(desglose.igssCentavos)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Otros Descuentos:</span>
              <span className="font-semibold text-rose-700">
                -{quetzales(desglose.descuentosCentavos)}
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 -my-1">
              <span className="text-emerald-700 block font-medium">Líquido a Recibir:</span>
              <span className="font-extrabold text-sm text-emerald-900">
                {quetzales(desglose.liquidoCentavos)}
              </span>
            </div>
          </div>
        </div>
      </FormConAviso>
    </div>
  );
}
