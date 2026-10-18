import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mayuscula, nombreMes } from "@/lib/cobros/utils";

const limpio = (s: string) => s.replace(/[–—]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

export type DatosLista = {
  colegio: { nombre: string };
  curso: string;
  grado: string;
  seccion: string;
  maestro: string;
  ciclo: number;
  anio: number;
  mes: number; // 1-12
  alumnos: { nombre: string; carnet: string }[];
};

const INICIAL = ["D", "L", "M", "M", "J", "V", "S"];

// Hoja de asistencia mensual (lunes a viernes) para llenar a mano
export async function pdfListaAsistencia(d: DatosLista): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const gris = rgb(0.45, 0.5, 0.55);
  const linea = rgb(0.72, 0.75, 0.8);
  const W = 792, H = 612, M = 30;

  const dias: { n: number; letra: string }[] = [];
  const total = new Date(Date.UTC(d.anio, d.mes, 0)).getUTCDate();
  for (let n = 1; n <= total; n++) {
    const dow = new Date(Date.UTC(d.anio, d.mes - 1, n)).getUTCDay();
    if (dow >= 1 && dow <= 5) dias.push({ n, letra: INICIAL[dow] });
  }

  const xNum = M, wNum = 22;
  const xNom = xNum + wNum, wNom = 190;
  const xDias = xNom + wNom;
  const wRes = 38; // columna final "Aus."
  const wDia = Math.min(20, (W - M - xDias - wRes) / dias.length);
  const xRes = xDias + wDia * dias.length;
  const alto = 19;
  const filasPorPagina = Math.floor((H - 150 - 50) / alto);
  const paginas = Math.max(1, Math.ceil(d.alumnos.length / filasPorPagina));

  const txt = (p: ReturnType<typeof doc.addPage>, s: string, x: number, y: number, font = f, size = 9, color = rgb(0.1, 0.1, 0.15)) =>
    p.drawText(limpio(s), { x, y, size, font, color });

  for (let pg = 0; pg < paginas; pg++) {
    const p = doc.addPage([W, H]);
    let y = H - M - 10;
    txt(p, d.colegio.nombre, M, y, b, 15);
    const titulo = "LISTA DE ASISTENCIA";
    p.drawText(titulo, { x: W - M - b.widthOfTextAtSize(titulo, 13), y, size: 13, font: b, color: rgb(0.1, 0.1, 0.15) });
    y -= 22;
    txt(p, "Curso:", M, y, b, 10); txt(p, d.curso, M + 38, y, f, 10);
    txt(p, "Grado:", 300, y, b, 10); txt(p, `${d.grado} "${d.seccion}"`, 338, y, f, 10);
    txt(p, "Mes:", 560, y, b, 10); txt(p, `${mayuscula(nombreMes(d.mes))} ${d.anio}`, 588, y, f, 10);
    y -= 16;
    txt(p, "Maestro:", M, y, b, 10); txt(p, d.maestro, M + 46, y, f, 10);
    txt(p, "Ciclo:", 300, y, b, 10); txt(p, String(d.ciclo), 338, y, f, 10);
    if (paginas > 1) txt(p, `Hoja ${pg + 1} de ${paginas}`, 560, y, f, 9, gris);
    y -= 22;

    // Encabezado de la tabla
    p.drawRectangle({ x: xNum, y: y - 14, width: xRes + wRes - xNum, height: 32, color: rgb(0.93, 0.95, 0.98), borderColor: linea, borderWidth: 0.6 });
    txt(p, "No.", xNum + 3, y - 2, b, 8);
    txt(p, "Alumno", xNom + 4, y - 2, b, 9);
    dias.forEach((dia, i) => {
      const x = xDias + i * wDia;
      const t = String(dia.n);
      p.drawText(t, { x: x + (wDia - b.widthOfTextAtSize(t, 8)) / 2, y: y + 5, size: 8, font: b, color: rgb(0.1, 0.1, 0.15) });
      p.drawText(dia.letra, { x: x + (wDia - f.widthOfTextAtSize(dia.letra, 7)) / 2, y: y - 6, size: 7, font: f, color: gris });
    });
    txt(p, "Aus.", xRes + 8, y - 2, b, 8);
    y -= 14;

    const desde = pg * filasPorPagina;
    const filas = d.alumnos.slice(desde, desde + filasPorPagina);
    const ultima = Math.max(filas.length, pg === 0 ? Math.min(filasPorPagina, filas.length) : filas.length);
    filas.forEach((a, i) => {
      const yy = y - (i + 1) * alto;
      if (i % 2 === 1) p.drawRectangle({ x: xNum, y: yy, width: xRes + wRes - xNum, height: alto, color: rgb(0.975, 0.98, 0.985) });
      txt(p, String(desde + i + 1), xNum + 4, yy + 6, f, 8, gris);
      let nombre = a.nombre;
      while (f.widthOfTextAtSize(limpio(nombre), 9) > wNom - 8 && nombre.length > 3) nombre = nombre.slice(0, -2);
      if (nombre !== a.nombre) nombre += ".";
      txt(p, nombre, xNom + 4, yy + 6, f, 9);
    });
    // Cuadrícula
    const yFin = y - ultima * alto;
    for (let i = 0; i <= ultima; i++) {
      const yy = y - i * alto;
      p.drawLine({ start: { x: xNum, y: yy }, end: { x: xRes + wRes, y: yy }, thickness: 0.5, color: linea });
    }
    const verticales = [xNum, xNom, xDias, ...dias.map((_, i) => xDias + (i + 1) * wDia), xRes + wRes];
    verticales.forEach((x) => p.drawLine({ start: { x, y: y }, end: { x, y: yFin }, thickness: 0.5, color: linea }));

    // Pie
    txt(p, "Marca: P presente  |  A ausente  |  T tarde  |  E excusa", M, 48, f, 8, gris);
    p.drawLine({ start: { x: W - M - 190, y: 52 }, end: { x: W - M, y: 52 }, thickness: 0.5, color: gris });
    txt(p, "Firma del maestro", W - M - 130, 40, f, 8, gris);
  }
  return doc.save();
}
