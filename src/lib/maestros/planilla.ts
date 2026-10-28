/**
 * Módulo de cálculo de planillas de sueldos para maestros (Guatemala).
 *
 * Fundamentos legales:
 * - Bonificación Incentivo: Decreto 78-89 del Congreso de la República de Guatemala y
 *   sus reformas (Decreto 37-2001), estableciendo Q 250.00 mensuales fijos. No está afecta a IGSS.
 * - Cuota Laboral IGSS: Decreto 295 del Congreso y Acuerdo 1124 de Junta Directiva del IGSS.
 *   El porcentaje es 4.83% sobre la remuneración ordinaria y extraordinaria (sueldo base + horas extra).
 *
 * Regla de precisión financiera:
 * Todo cálculo opera estrictamente en centavos como números enteros para prevenir
 * errores de redondeo en punto flotante. Los porcentajes se redondean al centavo al final.
 */

export const BONIFICACION_INCENTIVO_LEY_CENTAVOS = 25_000; // Q 250.00
export const TASA_IGSS_LABORAL = 0.0483; // 4.83%

export interface DatosCalculoPlanilla {
  sueldoBaseCentavos: number;
  bonificacionCentavos?: number;
  horasExtraCentavos?: number;
  descuentosCentavos?: number;
}

export interface DesglosePlanilla {
  sueldoBaseCentavos: number;
  bonificacionCentavos: number;
  horasExtraCentavos: number;
  baseAfectaIgssCentavos: number;
  igssCentavos: number;
  descuentosCentavos: number;
  totalIngresosCentavos: number;
  totalDescuentosCentavos: number;
  liquidoCentavos: number;
}

/**
 * Calcula el desglose completo de planilla para un maestro.
 * Retorna todos los conceptos monetarios en centavos enteros.
 */
export function calcularPlanillaMaestro(datos: DatosCalculoPlanilla): DesglosePlanilla {
  const sueldoBase = Math.max(0, Math.round(datos.sueldoBaseCentavos));
  const bonificacion = Math.max(
    0,
    Math.round(datos.bonificacionCentavos ?? BONIFICACION_INCENTIVO_LEY_CENTAVOS),
  );
  const horasExtra = Math.max(0, Math.round(datos.horasExtraCentavos ?? 0));
  const descuentos = Math.max(0, Math.round(datos.descuentosCentavos ?? 0));

  // La base afecta al IGSS comprende la remuneración ordinaria y extraordinaria (sueldo base + horas extra)
  const baseAfecta = sueldoBase + horasExtra;

  // Cuota laboral del 4.83%, redondeada al centavo al final
  const igss = Math.round(baseAfecta * TASA_IGSS_LABORAL);

  // Total de ingresos (devengado)
  const totalIngresos = sueldoBase + bonificacion + horasExtra;

  // Total de retenciones y deducciones
  const totalDescuentos = igss + descuentos;

  // Líquido a recibir (sueldo neto a pagar)
  const liquido = Math.max(0, totalIngresos - totalDescuentos);

  return {
    sueldoBaseCentavos: sueldoBase,
    bonificacionCentavos: bonificacion,
    horasExtraCentavos: horasExtra,
    baseAfectaIgssCentavos: baseAfecta,
    igssCentavos: igss,
    descuentosCentavos: descuentos,
    totalIngresosCentavos: totalIngresos,
    totalDescuentosCentavos: totalDescuentos,
    liquidoCentavos: liquido,
  };
}
