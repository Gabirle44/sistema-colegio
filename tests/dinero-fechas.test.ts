import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aCentavos, deCentavos, quetzales, parseCentavos, nombreMes,
  fechaHoraGT, mesGT, telefonoWhatsApp, csvCelda, csvFila, numeroRecibo, inicioDiaGT,
} from "../src/lib/cobros/utils";

test("dinero: convierte a centavos sin errores de decimales", () => {
  assert.equal(aCentavos("125.50"), 12_550);
  assert.equal(aCentavos("0.1") + aCentavos("0.2"), 30);
  assert.equal(deCentavos(12_550), "125.50");
});

test("dinero: formato en quetzales con separador de miles", () => {
  assert.equal(quetzales(0), "Q0.00");
  assert.equal(quetzales(123_456_789), "Q1,234,567.89");
  assert.equal(quetzales(-5_050), "-Q50.50");
});

test("dinero: parseCentavos acepta coma, rechaza negativos y texto", () => {
  assert.equal(parseCentavos("125,50"), 12_550);
  assert.equal(parseCentavos("-1"), null);
  assert.equal(parseCentavos("abc"), null);
  assert.equal(parseCentavos(""), null);
  assert.equal(parseCentavos("", { vacioEsCero: true }), 0);
});

test("fechas: la hora de Guatemala es UTC-6", () => {
  const d = new Date("2026-10-30T03:30:00.000Z"); // 29 oct 21:30 en Guatemala
  assert.equal(fechaHoraGT(d), "29/10/2026 21:30");
  assert.equal(mesGT(new Date("2026-11-01T03:00:00.000Z")), "2026-10");
  assert.equal(inicioDiaGT("2026-10-30").toISOString(), "2026-10-30T06:00:00.000Z");
});

test("meses en español, con vuelta al pasar de 12", () => {
  assert.equal(nombreMes(1), "enero");
  assert.equal(nombreMes(12), "diciembre");
  assert.equal(nombreMes(13), "enero");
});

test("teléfono: agrega 502 a números de 8 dígitos", () => {
  assert.equal(telefonoWhatsApp("5555-1234"), "50255551234");
  assert.equal(telefonoWhatsApp("50255551234"), "50255551234");
  assert.equal(telefonoWhatsApp(null), null);
  assert.equal(telefonoWhatsApp("123"), null);
});

test("CSV: escapa comillas, comas y saltos de línea", () => {
  assert.equal(csvCelda('Pérez, "Juan"'), '"Pérez, ""Juan"""');
  assert.equal(csvFila(["a", 1, null]), "a,1,");
});

test("recibo: número con serie y ceros a la izquierda", () => {
  assert.equal(numeroRecibo({ serie: "A", numero: 42 }), "A-000042");
});
