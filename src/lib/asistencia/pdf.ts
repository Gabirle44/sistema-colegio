import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { mayuscula, nombreMes } from "@/lib/cobros/utils";

const limpio = (s: string) => s.replace(/[–—]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

export type DatosLista = {
  colegio: { nombre: string; direccion?: string; telefono?: string };
  curso: string;
  grado: string;
  seccion: string;
  maestro: string;
  ciclo: number;
  anio: number;
  mes: number; // 1-12
  alumnos: { nombre: string; carnet: string }[];
};

// Paleta: igual que la del sistema
const NAVY = rgb(0.082, 0.137, 0.231);
const AMBAR = rgb(0.99, 0.82, 0.35);
const TINTA = rgb(0.11, 0.13, 0.18);
const GRIS = rgb(0.45, 0.5, 0.56);
const LINEA = rgb(0.80, 0.83, 0.87);
const LINEA_FUERTE = rgb(0.62, 0.66, 0.72);
const FILA_ALT = rgb(0.973, 0.980, 0.988);
const CABECERA = rgb(0.93, 0.95, 0.975);
const VERDE = rgb(0.09, 0.55, 0.3);
const ROJO = rgb(0.78, 0.15, 0.15);
const AMBAR_OSC = rgb(0.72, 0.45, 0.05);
const AZUL = rgb(0.11, 0.42, 0.65);

const INICIAL = ["D", "L", "M", "M", "J", "V", "S"];
const RESUMEN = [
  { letra: "P", color: VERDE },
  { letra: "A", color: ROJO },
  { letra: "T", color: AMBAR_OSC },
  { letra: "E", color: AZUL },
];

// Hoja de asistencia mensual (lunes a viernes) para llenar a mano
export async function pdfListaAsistencia(d: DatosLista): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 792, H = 612, M = 28;
  const ALTO_FILA = 19;

  // Días hábiles del mes
  const dias: { n: number; letra: string; lunes: boolean }[] = [];
  const ultimoDia = new Date(Date.UTC(d.anio, d.mes, 0)).getUTCDate();
  for (let n = 1; n <= ultimoDia; n++) {
    const dow = new Date(Date.UTC(d.anio, d.mes - 1, n)).getUTCDay();
    if (dow >= 1 && dow <= 5) dias.push({ n, letra: INICIAL[dow], lunes: dow === 1 });
  }

  // Medidas de la tabla (la columna de nombre absorbe el espacio sobrante)
  const wNum = 22;
  const wSum = 20;
  const anchoResumen = wSum * RESUMEN.length;
  const wDia = Math.min(19, (W - 2 * M - wNum - 190 - anchoResumen) / Math.max(1, dias.length));
  const anchoDias = wDia * dias.length;
  const xNum = M;
  const xNom = xNum + wNum;
  const wNom = W - 2 * M - wNum - anchoDias - anchoResumen;
  const xDias = xNom + wNom;
  const xSum = xDias + anchoDias;
  const xFin = xSum + anchoResumen;

  const txt = (p: PDFPage, s: string, x: number, y: number, font = f, size = 9, color = TINTA) =>
    p.drawText(limpio(s), { x, y, size, font, color });
  const centro = (p: PDFPage, s: string, x: number, ancho: number, y: number, font: PDFFont, size: number, color = TINTA) => {
    const t = limpio(s);
    p.drawText(t, { x: x + (ancho - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
  };
  const derecha = (p: PDFPage, s: string, xDer: number, y: number, font: PDFFont, size: number, color = TINTA) => {
    const t = limpio(s);
    p.drawText(t, { x: xDer - font.widthOfTextAtSize(t, size), y, size, font, color });
  };
  const recortar = (s: string, ancho: number, size = 9) => {
    let t = s;
    while (f.widthOfTextAtSize(limpio(t), size) > ancho && t.length > 4) t = t.slice(0, -2);
    return t === s ? s : `${t}.`;
  };

  // La tabla arranca bajo la banda y los datos del curso; dejamos sitio al pie
  const yTablaInicial = H - 56 - 34 - 16 - 30;
  const filasPorPagina = Math.max(1, Math.floor((yTablaInicial - 80) / ALTO_FILA));
  const paginas = Math.max(1, Math.ceil(d.alumnos.length / filasPorPagina));

  for (let pg = 0; pg < paginas; pg++) {
    const p = doc.addPage([W, H]);

    // ── Banda superior ──
    p.drawRectangle({ x: 0, y: H - 52, width: W, height: 52, color: NAVY });
    p.drawRectangle({ x: 0, y: H - 56, width: W, height: 4, color: AMBAR });
    txt(p, d.colegio.nombre, M, H - 30, b, 16, rgb(1, 1, 1));
    const sub = [d.colegio.direccion, d.colegio.telefono && `Tel. ${d.colegio.telefono}`].filter(Boolean).join("  ·  ");
    if (sub) txt(p, sub, M, H - 44, f, 7.5, rgb(0.72, 0.78, 0.88));
    derecha(p, "LISTA DE ASISTENCIA", W - M, H - 28, b, 13, AMBAR);
    derecha(p, `${mayuscula(nombreMes(d.mes))} ${d.anio}`, W - M, H - 43, f, 9.5, rgb(0.82, 0.86, 0.93));

    // ── Datos del curso ──
    let y = H - 56 - 34;
    p.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 28, color: rgb(0.965, 0.972, 0.98), borderColor: LINEA, borderWidth: 0.6 });
    const datos: [string, string][] = [
      ["Curso", d.curso],
      ["Grado", `${d.grado} "${d.seccion}"`],
      ["Maestro", d.maestro],
      ["Ciclo", String(d.ciclo)],
    ];
    let x = M + 10;
    const anchoCampo = (W - 2 * M - 20) / datos.length;
    for (const [etq, val] of datos) {
      txt(p, etq.toUpperCase(), x, y + 12, b, 6.5, GRIS);
      txt(p, recortar(val, anchoCampo - 14, 9.5), x, y + 1, f, 9.5);
      x += anchoCampo;
    }

    // ── Encabezado de la tabla ──
    y -= 16;
    const altoCab = 30;
    p.drawRectangle({ x: xNum, y: y - altoCab, width: xFin - xNum, height: altoCab, color: CABECERA });
    p.drawRectangle({ x: xSum, y: y - altoCab, width: anchoResumen, height: altoCab, color: rgb(0.89, 0.92, 0.96) });
    txt(p, "No.", xNum + 4, y - 19, b, 7, GRIS);
    txt(p, "ALUMNO", xNom + 6, y - 19, b, 8, GRIS);
    dias.forEach((dia, i) => {
      const xd = xDias + i * wDia;
      centro(p, String(dia.n), xd, wDia, y - 13, b, 7.5);
      centro(p, dia.letra, xd, wDia, y - 24, f, 6.5, GRIS);
    });
    centro(p, "TOTALES", xSum, anchoResumen, y - 11, b, 6.5, GRIS);
    RESUMEN.forEach((r, i) => centro(p, r.letra, xSum + i * wSum, wSum, y - 23, b, 8, r.color));

    // ── Filas ──
    const yTabla = y - altoCab;
    const desde = pg * filasPorPagina;
    const filas = d.alumnos.slice(desde, desde + filasPorPagina);
    const nFilas = Math.max(filas.length, 1);

    filas.forEach((a, i) => {
      const yy = yTabla - (i + 1) * ALTO_FILA;
      if (i % 2 === 1) p.drawRectangle({ x: xNum, y: yy, width: xFin - xNum, height: ALTO_FILA, color: FILA_ALT });
      p.drawRectangle({ x: xSum, y: yy, width: anchoResumen, height: ALTO_FILA, color: rgb(0.95, 0.96, 0.98), opacity: 0.7 });
      centro(p, String(desde + i + 1), xNum, wNum, yy + 6, f, 7.5, GRIS);
      txt(p, recortar(a.nombre, wNom - 12), xNom + 6, yy + 6, f, 9);
    });

    const yFin = yTabla - nFilas * ALTO_FILA;
    // Horizontales
    for (let i = 0; i <= nFilas; i++) {
      const yy = yTabla - i * ALTO_FILA;
      p.drawLine({ start: { x: xNum, y: yy }, end: { x: xFin, y: yy }, thickness: 0.5, color: LINEA });
    }
    // Verticales (más marcada al iniciar semana y en los bordes de bloque)
    p.drawLine({ start: { x: xNum, y: yTabla }, end: { x: xNum, y: yFin }, thickness: 0.8, color: LINEA_FUERTE });
    p.drawLine({ start: { x: xNom, y: yTabla }, end: { x: xNom, y: yFin }, thickness: 0.5, color: LINEA });
    dias.forEach((dia, i) => {
      const xd = xDias + i * wDia;
      const fuerte = i === 0 || dia.lunes;
      p.drawLine({ start: { x: xd, y: yTabla }, end: { x: xd, y: yFin }, thickness: fuerte ? 0.8 : 0.4, color: fuerte ? LINEA_FUERTE : LINEA });
    });
    RESUMEN.forEach((_, i) => {
      const xs = xSum + i * wSum;
      p.drawLine({ start: { x: xs, y: yTabla }, end: { x: xs, y: yFin }, thickness: i === 0 ? 0.8 : 0.4, color: i === 0 ? LINEA_FUERTE : LINEA });
    });
    p.drawLine({ start: { x: xFin, y: yTabla }, end: { x: xFin, y: yFin }, thickness: 0.8, color: LINEA_FUERTE });
    // Marco del encabezado
    p.drawRectangle({ x: xNum, y: yTabla, width: xFin - xNum, height: altoCab, borderColor: LINEA_FUERTE, borderWidth: 0.8 });

    // ── Pie: leyenda y firmas ──
    txt(p, "MARCA EN CADA CASILLA", M, 62, b, 6.5, GRIS);
    let xl = M;
    const leyenda: [string, string, typeof VERDE][] = [
      ["P", "Presente", VERDE], ["A", "Ausente", ROJO], ["T", "Tarde", AMBAR_OSC], ["E", "Excusa", AZUL],
    ];
    for (const [letra, texto, color] of leyenda) {
      p.drawRectangle({ x: xl, y: 44, width: 12, height: 12, color, opacity: 0.14, borderColor: color, borderWidth: 0.6 });
      centro(p, letra, xl, 12, 47, b, 7.5, color);
      txt(p, texto, xl + 16, 47, f, 8, GRIS);
      xl += 16 + f.widthOfTextAtSize(texto, 8) + 14;
    }

    const firma = (x: number, ancho: number, etq: string) => {
      p.drawLine({ start: { x, y: 52 }, end: { x: x + ancho, y: 52 }, thickness: 0.6, color: LINEA_FUERTE });
      centro(p, etq, x, ancho, 42, f, 7.5, GRIS);
    };
    firma(W - M - 380, 170, "Firma del maestro");
    firma(W - M - 180, 180, "Vo.Bo. Direccion");

    p.drawLine({ start: { x: M, y: 30 }, end: { x: W - M, y: 30 }, thickness: 0.5, color: LINEA });
    txt(p, `${d.alumnos.length} alumno(s) inscritos`, M, 20, f, 7, GRIS);
    derecha(p, `Hoja ${pg + 1} de ${paginas}`, W - M, 20, f, 7, GRIS);
  }
  return doc.save();
}
