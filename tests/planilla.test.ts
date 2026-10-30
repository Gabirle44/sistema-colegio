import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularPlanillaMaestro,
  BONIFICACION_INCENTIVO_LEY_CENTAVOS,
} from "../src/lib/maestros/planilla";

test("planilla: sueldo Q3,000 → IGSS 4.83% sobre el sueldo y bonificación Q250 sin IGSS", () => {
  const r = calcularPlanillaMaestro({ sueldoBaseCentavos: 300_000 });
  assert.equal(r.igssCentavos, 14_490); // Q144.90
  assert.equal(r.bonificacionCentavos, BONIFICACION_INCENTIVO_LEY_CENTAVOS);
  assert.equal(r.totalIngresosCentavos, 325_000);
  assert.equal(r.liquidoCentavos, 310_510); // Q3,105.10
});

test("planilla: las horas extra sí cuentan para el IGSS", () => {
  const r = calcularPlanillaMaestro({ sueldoBaseCentavos: 200_000, horasExtraCentavos: 50_000 });
  assert.equal(r.baseAfectaIgssCentavos, 250_000);
  assert.equal(r.igssCentavos, 12_075);
});

test("planilla: todos los montos son enteros (sin decimales flotantes)", () => {
  const r = calcularPlanillaMaestro({ sueldoBaseCentavos: 123_457, descuentosCentavos: 333 });
  for (const v of Object.values(r)) assert.ok(Number.isInteger(v));
});

test("planilla: valores negativos se tratan como cero y el líquido nunca es negativo", () => {
  const r = calcularPlanillaMaestro({ sueldoBaseCentavos: -500, descuentosCentavos: 9_999_999 });
  assert.equal(r.sueldoBaseCentavos, 0);
  assert.equal(r.liquidoCentavos, 0);
});

test("planilla: se puede cambiar la bonificación", () => {
  const r = calcularPlanillaMaestro({ sueldoBaseCentavos: 100_000, bonificacionCentavos: 0 });
  assert.equal(r.totalIngresosCentavos, 100_000);
});
