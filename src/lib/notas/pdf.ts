import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Ajustes, Boleta } from "./boleta";
import { etiquetaResultado, fmtNota } from "./calculo";

const limpio = (s: string) => s.replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
const oscuro = rgb(0.1, 0.1, 0.15);
const gris = rgb(0.4, 0.45, 0.5);
const rojo = rgb(0.8, 0.1, 0.1);
const verde = rgb(0.05, 0.5, 0.2);

function t(page: PDFPage, s: string, x: number, y: number, font: PDFFont, size = 10, color = oscuro) {
  page.drawText(limpio(s), { x, y, size, font, color });
}
function centrado(page: PDFPage, s: string, cx: number, y: number, font: PDFFont, size = 10, color = oscuro) {
  const x = cx - font.widthOfTextAtSize(limpio(s), size) / 2;
  t(page, s, x, y, font, size, color);
}
function recortar(s: string, font: PDFFont, size: number, ancho: number): string {
  let out = limpio(s);
  while (out.length > 1 && font.widthOfTextAtSize(out, size) > ancho) out = out.slice(0, -1);
  return out;
}
function ajustar(s: string, font: PDFFont, size: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const p of limpio(s).split(/\s+/)) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (font.widthOfTextAtSize(prueba, size) > ancho && actual) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// Una página por alumno
export async function pdfBoletas(boletas: Boleta[], ajustes: Ajustes): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const bo of boletas) {
    const page = doc.addPage([612, 792]);
    let y = 745;
    t(page, ajustes.nombreColegio, 40, y, b, 17);
    const sub = [ajustes.direccion, ajustes.telefono && `Tel. ${ajustes.telefono}`].filter(Boolean).join("  |  ");
    if (sub) t(page, sub, 40, y - 14, f, 8.5, gris);
    const titulo = "BOLETA DE CALIFICACIONES";
    t(page, titulo, 572 - b.widthOfTextAtSize(titulo, 12), y, b, 12);
    const ciclo = `Ciclo escolar ${bo.ciclo}`;
    t(page, ciclo, 572 - f.widthOfTextAtSize(ciclo, 9.5), y - 15, f, 9.5, gris);
    y -= 34;
    page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 1, color: rgb(0.75, 0.78, 0.82) });
    y -= 20;
    t(page, "Alumno:", 40, y, b); t(page, bo.alumno.nombre, 92, y, f);
    t(page, "Carnet:", 400, y, b); t(page, bo.alumno.carnet, 445, y, f);
    y -= 15;
    t(page, "Grado:", 40, y, b); t(page, `${bo.grado} "${bo.seccion}"`, 92, y, f);
    t(page, "Encargado:", 300, y, b); t(page, recortar(bo.alumno.encargado, f, 10, 170), 362, y, f);
    y -= 28;

    // Tabla: Curso | periodos... | Promedio | Resultado
    const np = Math.max(1, bo.periodos.length);
    const xCurso = 40, wCurso = 190;
    const wRes = 70, wProm = 55;
    const wPer = Math.min(55, (532 - wCurso - wRes - wProm) / np);
    const xTabla = xCurso + wCurso;
    page.drawRectangle({ x: 40, y: y - 6, width: 532, height: 22, color: rgb(0.93, 0.95, 0.98) });
    t(page, "Curso", 46, y, b, 9.5);
    bo.periodos.forEach((p, i) => centrado(page, recortar(p.nombre.replace("Bimestre", "Bim."), b, 8.5, wPer - 4), xTabla + wPer * i + wPer / 2, y, b, 8.5));
    centrado(page, "Promedio", xTabla + wPer * np + wProm / 2, y, b, 9);
    centrado(page, "Resultado", xTabla + wPer * np + wProm + wRes / 2, y, b, 9);
    y -= 24;

    for (const c of bo.cursos) {
      t(page, recortar(c.nombre, f, 9.5, wCurso - 10), 46, y, f, 9.5);
      c.notas.forEach((n, i) => {
        centrado(page, fmtNota(n), xTabla + wPer * i + wPer / 2, y, f, 9.5, n === null ? gris : n < ajustes.notaMinima ? rojo : oscuro);
      });
      centrado(page, fmtNota(c.promedio), xTabla + wPer * np + wProm / 2, y, b, 9.5,
        c.resultado === "REPROBADO" ? rojo : oscuro);
      centrado(page, etiquetaResultado[c.resultado], xTabla + wPer * np + wProm + wRes / 2, y, f, 8.5,
        c.resultado === "REPROBADO" ? rojo : c.resultado === "APROBADO" ? verde : gris);
      page.drawLine({ start: { x: 40, y: y - 6 }, end: { x: 572, y: y - 6 }, thickness: 0.4, color: rgb(0.88, 0.9, 0.93) });
      y -= 19;
    }
    if (bo.cursos.length === 0) { t(page, "Sin cursos registrados para este grado.", 46, y, f, 9.5, gris); y -= 19; }

    y -= 4;
    t(page, `PROMEDIO GENERAL: ${fmtNota(bo.promedioGeneral)}`, 46, y, b, 11);
    const res = `RESULTADO: ${etiquetaResultado[bo.resultado].toUpperCase()}`;
    t(page, res, 572 - b.widthOfTextAtSize(res, 11), y, b, 11, bo.resultado === "REPROBADO" ? rojo : bo.resultado === "APROBADO" ? verde : gris);
    y -= 14;
    t(page, `Nota mínima para aprobar: ${ajustes.notaMinima}`, 46, y, f, 8.5, gris);
    y -= 28;

    // Conducta e inasistencias por periodo
    t(page, "Conducta y asistencia", 40, y, b, 10); y -= 16;
    bo.periodos.forEach((p, i) => {
      const d = bo.datosPeriodo[i];
      t(page, `${p.nombre}:`, 46, y, f, 9);
      t(page, `Conducta: ${d.conducta ?? "—"}`, 140, y, f, 9);
      t(page, `Inasistencias: ${d.inasistencias}`, 300, y, f, 9);
      y -= 14;
    });
    t(page, `Total de inasistencias: ${bo.totalInasistencias}`, 46, y, f, 9, gris);
    y -= 24;

    const comentarios = bo.periodos.map((p, i) => ({ p: p.nombre, c: bo.datosPeriodo[i].comentario })).filter((x) => x.c);
    if (comentarios.length > 0) {
      t(page, "Comentarios", 40, y, b, 10); y -= 15;
      for (const cm of comentarios) {
        for (const ln of ajustar(`${cm.p}: ${cm.c}`, f, 9, 520)) { t(page, ln, 46, y, f, 9); y -= 12; }
      }
    }

    page.drawLine({ start: { x: 60, y: 90 }, end: { x: 240, y: 90 }, thickness: 0.6, color: gris });
    centrado(page, "Maestro(a) / Dirección", 150, 77, f, 9, gris);
    page.drawLine({ start: { x: 370, y: 90 }, end: { x: 550, y: 90 }, thickness: 0.6, color: gris });
    centrado(page, "Encargado enterado", 460, 77, f, 9, gris);
  }
  if (boletas.length === 0) doc.addPage([612, 792]);
  return doc.save();
}
