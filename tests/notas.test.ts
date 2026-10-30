import { test } from "node:test";
import assert from "node:assert/strict";
import { promedio, resultadoCurso, fmtNota } from "../src/lib/notas/calculo";
import { partirLinea, detectarSeparador, escCsv, sinTildes } from "../src/lib/notas/csv";

test("notas: promedio ignora periodos sin nota y redondea a 2 decimales", () => {
  assert.equal(promedio([80, 90, null]), 85);
  assert.equal(promedio([70, 71, 71]), 70.67);
  assert.equal(promedio([null, null]), null);
});

test("notas: un curso queda EN_PROCESO hasta tener todos los periodos", () => {
  assert.equal(resultadoCurso([90, null, 80, 70], 60), "EN_PROCESO");
});

test("notas: aprobado en el límite y reprobado por debajo", () => {
  assert.equal(resultadoCurso([60, 60, 60, 60], 60), "APROBADO");
  assert.equal(resultadoCurso([59, 59, 60, 60], 60), "REPROBADO");
});

test("notas: formato de nota", () => {
  assert.equal(fmtNota(85), "85");
  assert.equal(fmtNota(85.256), "85.26");
  assert.equal(fmtNota(null), "—");
});

test("csv: separa respetando comillas y detecta el separador", () => {
  assert.deepEqual(partirLinea('Ana;"Pérez; López";90', ";"), ["Ana", "Pérez; López", "90"]);
  assert.equal(detectarSeparador("carne;nombre;nota"), ";");
  assert.equal(detectarSeparador("carne\tnombre\tnota"), "\t");
  assert.equal(detectarSeparador("carne,nombre,nota"), ",");
});

test("csv: escapa y quita tildes", () => {
  assert.equal(escCsv('di "hola"'), '"di ""hola"""');
  assert.equal(sinTildes("  Matemáticas "), "matematicas");
});
