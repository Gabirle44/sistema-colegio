import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { montoALetras } from "./letras";
import { aCentavos, fechaCorta, fechaHoraGT, numeroRecibo, quetzales } from "./utils";

// Las fuentes estándar solo soportan Latin-1: reemplazamos lo que no se pueda dibujar
const limpio = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

type Linea = { descripcion: string; monto: number };

export type DatosRecibo = {
  colegio: { nombre: string; direccion: string; telefono: string };
  recibo: {
    serie: string; numero: number; fecha: Date; metodo: string; referencia: string | null;
    observaciones: string | null; anulado: boolean; motivoAnulacion: string | null; emitidoPor: string; total: number;
  };
  alumno: { nombre: string; carnet: string; grado: string; seccion: string; encargado: string };
  lineas: Linea[];
};

function texto(page: PDFPage, s: string, x: number, y: number, font: PDFFont, size = 10, color = rgb(0.1, 0.1, 0.15)) {
  page.drawText(limpio(s), { x, y, size, font, color });
}
function derecha(page: PDFPage, s: string, xDer: number, y: number, font: PDFFont, size = 10) {
  const t = limpio(s);
  page.drawText(t, { x: xDer - font.widthOfTextAtSize(t, size), y, size, font, color: rgb(0.1, 0.1, 0.15) });
}
function ajustar(s: string, font: PDFFont, size: number, ancho: number): string[] {
  const palabras = limpio(s).split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (font.widthOfTextAtSize(prueba, size) > ancho && actual) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function pdfRecibo(d: DatosRecibo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 396 + Math.max(0, d.lineas.length - 6) * 18 + 60]); // media carta que crece
  const { height } = page.getSize();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const gris = rgb(0.4, 0.45, 0.5);
  let y = height - 40;

  texto(page, d.colegio.nombre, 40, y, b, 16);
  const sub = [d.colegio.direccion, d.colegio.telefono && `Tel. ${d.colegio.telefono}`].filter(Boolean).join("  |  ");
  if (sub) texto(page, sub, 40, y - 14, f, 8.5, gris);
  derecha(page, "RECIBO DE CAJA", 572, y, b, 13);
  derecha(page, `No. ${numeroRecibo(d.recibo)}`, 572, y - 16, b, 12);
  derecha(page, `Fecha: ${fechaHoraGT(d.recibo.fecha)}`, 572, y - 30, f, 9);
  y -= 52;
  page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 1, color: rgb(0.75, 0.78, 0.82) });
  y -= 18;

  texto(page, "Alumno:", 40, y, b); texto(page, `${d.alumno.nombre}  (Carnet ${d.alumno.carnet})`, 95, y, f);
  y -= 15;
  texto(page, "Grado:", 40, y, b); texto(page, `${d.alumno.grado} "${d.alumno.seccion}"`, 95, y, f);
  texto(page, "Encargado:", 300, y, b); texto(page, d.alumno.encargado, 365, y, f);
  y -= 24;

  page.drawRectangle({ x: 40, y: y - 4, width: 532, height: 18, color: rgb(0.93, 0.95, 0.98) });
  texto(page, "Concepto", 46, y, b, 9.5); derecha(page, "Monto", 566, y, b, 9.5);
  y -= 20;
  for (const l of d.lineas) {
    texto(page, l.descripcion, 46, y, f, 9.5);
    derecha(page, quetzales(l.monto), 566, y, f, 9.5);
    y -= 16;
  }
  page.drawLine({ start: { x: 40, y: y + 8 }, end: { x: 572, y: y + 8 }, thickness: 0.5, color: rgb(0.75, 0.78, 0.82) });
  y -= 8;
  derecha(page, `TOTAL: ${quetzales(d.recibo.total)}`, 566, y, b, 12);
  y -= 18;
  for (const ln of ajustar(`Son: ${montoALetras(d.recibo.total)}`, f, 9.5, 520)) { texto(page, ln, 46, y, f, 9.5); y -= 13; }
  y -= 6;
  const pago = `Forma de pago: ${d.recibo.metodo.charAt(0) + d.recibo.metodo.slice(1).toLowerCase()}` +
    (d.recibo.referencia ? `   |   Boleta/Ref.: ${d.recibo.referencia}` : "");
  texto(page, pago, 46, y, f, 9.5, gris); y -= 13;
  if (d.recibo.observaciones) { texto(page, `Obs.: ${d.recibo.observaciones}`, 46, y, f, 9, gris); y -= 13; }

  texto(page, `Emitido por: ${d.recibo.emitidoPor}`, 40, 40, f, 8.5, gris);
  page.drawLine({ start: { x: 400, y: 52 }, end: { x: 572, y: 52 }, thickness: 0.5, color: gris });
  texto(page, "Firma y sello", 460, 40, f, 8.5, gris);

  if (d.recibo.anulado) {
    page.drawText("ANULADO", { x: 130, y: height / 2 - 40, size: 90, font: b, color: rgb(0.85, 0.15, 0.15), opacity: 0.25, rotate: degrees(20) });
    if (d.recibo.motivoAnulacion) texto(page, `Motivo de anulación: ${d.recibo.motivoAnulacion}`, 46, y - 6, f, 9, rgb(0.8, 0.1, 0.1));
  }
  return doc.save();
}

export type DatosSolvencia = {
  colegio: { nombre: string; direccion: string; telefono: string };
  alumno: { nombre: string; carnet: string; grado: string; seccion: string };
  ciclo: number; fecha: Date; solvente: boolean; saldo: number; cuotasPendientes: number;
};

export async function pdfSolvencia(d: DatosSolvencia): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 720;
  const centro = (s: string, yy: number, font: PDFFont, size: number) =>
    texto(page, s, 306 - font.widthOfTextAtSize(limpio(s), size) / 2, yy, font, size);

  centro(d.colegio.nombre, y, b, 20); y -= 18;
  const sub = [d.colegio.direccion, d.colegio.telefono && `Tel. ${d.colegio.telefono}`].filter(Boolean).join("  |  ");
  if (sub) centro(sub, y, f, 9);
  y -= 50;
  centro(d.solvente ? "CONSTANCIA DE SOLVENCIA" : "ESTADO DE CUENTA PENDIENTE", y, b, 16);
  y -= 50;

  const cuerpo = d.solvente
    ? `Se hace constar que el/la alumno(a) ${d.alumno.nombre}, con carnet ${d.alumno.carnet}, inscrito(a) en ${d.alumno.grado} "${d.alumno.seccion}" del ciclo escolar ${d.ciclo}, se encuentra SOLVENTE con el colegio a la fecha de emision de este documento, sin saldos pendientes de pago.`
    : `El/la alumno(a) ${d.alumno.nombre}, con carnet ${d.alumno.carnet}, inscrito(a) en ${d.alumno.grado} "${d.alumno.seccion}" del ciclo escolar ${d.ciclo}, NO se encuentra solvente: tiene ${d.cuotasPendientes} cuota(s) pendiente(s) por un saldo de ${quetzales(d.saldo)}.`;
  for (const ln of ajustar(cuerpo, f, 12, 480)) { texto(page, ln, 66, y, f, 12); y -= 20; }
  y -= 20;
  texto(page, `Guatemala, ${fechaCorta(new Date(d.fecha.getTime() - 6 * 3_600_000))}.`, 66, y, f, 12);
  page.drawLine({ start: { x: 200, y: 200 }, end: { x: 412, y: 200 }, thickness: 0.7, color: rgb(0.3, 0.3, 0.3) });
  centro("Administracion", 184, f, 10);
  return doc.save();
}

export { aCentavos };
