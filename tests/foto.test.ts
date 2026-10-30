import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarTipoFoto, validarBytesFoto, FOTO_MAX_BYTES } from "../src/lib/validaciones/foto";

const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]);
const jpg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

test("foto: reconoce PNG y JPEG por sus bytes, no por el nombre", () => {
  assert.equal(detectarTipoFoto(png()), "image/png");
  assert.equal(detectarTipoFoto(jpg()), "image/jpeg");
});

test("foto: rechaza archivos que no son imagen aunque se llamen .jpg", () => {
  const texto = new TextEncoder().encode("<script>alert(1)</script>");
  assert.equal(detectarTipoFoto(texto), null);
  assert.equal(validarBytesFoto(new Uint8Array(texto)).error, "La foto debe ser JPG o PNG");
});

test("foto: rechaza más de 200 KB y acepta justo el límite", () => {
  const grande = new Uint8Array(FOTO_MAX_BYTES + 1);
  grande.set(png());
  assert.equal(validarBytesFoto(grande).error, "La foto pesa más de 200 KB");
  const limite = new Uint8Array(FOTO_MAX_BYTES);
  limite.set(png());
  assert.ok(validarBytesFoto(limite).datos);
});
