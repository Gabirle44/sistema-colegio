import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fechaHoraGT } from "@/lib/cobros/utils";
import { fmtNota } from "./calculo";
import type { DatosCuadroNotas } from "./cuadro";

// Sanitiza caracteres fuera de WinAnsi (Helvetica) para evitar excepciones en pdf-lib
function limpio(s: string): string {
  return (s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022]/g, "*")
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function recortar(s: string, font: PDFFont, size: number, anchoMax: number): string {
  let out = limpio(s);
  while (out.length > 1 && font.widthOfTextAtSize(out, size) > anchoMax) {
    out = out.slice(0, -1);
  }
  return out;
}

export async function generarPdfCuadroNotas(d: DatosCuadroNotas): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);

  // Paleta visual semántica
  const oscuro = rgb(0.1, 0.12, 0.16);
  const gris = rgb(0.42, 0.46, 0.52);
  const grisClaro = rgb(0.85, 0.88, 0.92);
  const lineaBorde = rgb(0.72, 0.77, 0.85);
  const azulInstitucional = rgb(0.12, 0.24, 0.45);
  const bgCabecera1 = rgb(0.91, 0.94, 0.98);
  const bgCabecera2 = rgb(0.95, 0.97, 0.99);
  const bgFilaPar = rgb(0.985, 0.99, 1.0);
  const rojoReprobado = rgb(0.75, 0.12, 0.12);
  const verdeAprobado = rgb(0.08, 0.45, 0.2);

  // Helper para dibujar texto
  const t = (page: PDFPage, s: string, x: number, y: number, font = f, size = 8.5, color = oscuro) => {
    page.drawText(limpio(s), { x, y, size, font, color });
  };

  const centrado = (
    page: PDFPage,
    s: string,
    cx: number,
    y: number,
    font = f,
    size = 8.5,
    color = oscuro,
  ) => {
    const text = limpio(s);
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: cx - w / 2, y, size, font, color });
  };

  const derecha = (
    page: PDFPage,
    s: string,
    xDer: number,
    y: number,
    font = f,
    size = 8.5,
    color = oscuro,
  ) => {
    const text = limpio(s);
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xDer - w, y, size, font, color });
  };

  // Configuración de dimensiones (Página Horizontal Carta: 792 x 612)
  const pageWidth = 792;
  const pageHeight = 612;
  const margenX = 36;
  const tablaAncho = pageWidth - margenX * 2; // 720 pt

  // Columnas fijas
  const wNo = 22;
  const wCarnet = 58;
  const wAlumno = 175;
  const wPromedio = 45;

  const numPeriodos = Math.max(1, d.periodos.length);
  const espacioPeriodos = tablaAncho - wNo - wCarnet - wAlumno - wPromedio; // 420 pt con 4 periodos
  const wPeriodo = espacioPeriodos / numPeriodos; // 105 pt cada periodo
  const wZona = Math.floor(wPeriodo * 0.31); // 32 pt
  const wExamen = Math.floor(wPeriodo * 0.31); // 32 pt
  const wTotal = wPeriodo - wZona - wExamen; // 41 pt

  const xNo = margenX;
  const xCarnet = xNo + wNo;
  const xAlumno = xCarnet + wCarnet;
  const xPeriodos = xAlumno + wAlumno;
  const xPromedio = xPeriodos + espacioPeriodos;

  const altoCabecera1 = 18;
  const altoCabecera2 = 14;
  const altoCabeceraTotal = altoCabecera1 + altoCabecera2;
  const altoFila = 15;
  const margenInferior = 42;

  let currentPage: PDFPage;
  let currentY = 0;

  function dibujarCabeceraTabla(page: PDFPage, yTop: number) {
    const y1 = yTop - altoCabecera1;
    const y2 = y1 - altoCabecera2;

    // Fondo Cabecera Nivel 1
    page.drawRectangle({
      x: margenX,
      y: y1,
      width: tablaAncho,
      height: altoCabecera1,
      color: bgCabecera1,
    });

    // Fondo Cabecera Nivel 2
    page.drawRectangle({
      x: margenX,
      y: y2,
      width: tablaAncho,
      height: altoCabecera2,
      color: bgCabecera2,
    });

    // Marco exterior de cabecera
    page.drawRectangle({
      x: margenX,
      y: y2,
      width: tablaAncho,
      height: altoCabeceraTotal,
      borderColor: lineaBorde,
      borderWidth: 1,
    });

    // Separador horizontal entre Nivel 1 y Nivel 2 en la zona de periodos
    page.drawLine({
      start: { x: xPeriodos, y: y1 },
      end: { x: xPromedio, y: y1 },
      thickness: 0.8,
      color: lineaBorde,
    });

    // Textos de columnas fijas (centrados verticalmente en los dos niveles)
    const yFijos = y2 + (altoCabeceraTotal - 8.5) / 2 + 1;
    centrado(page, "No.", xNo + wNo / 2, yFijos, b, 8, azulInstitucional);
    centrado(page, "Carnet", xCarnet + wCarnet / 2, yFijos, b, 8, azulInstitucional);
    t(page, "Apellidos y Nombres", xAlumno + 6, yFijos, b, 8.5, azulInstitucional);
    centrado(page, "Prom.", xPromedio + wPromedio / 2, yFijos, b, 8.5, azulInstitucional);

    // Líneas divisoras verticales fijas
    [xCarnet, xAlumno, xPeriodos, xPromedio].forEach((x) => {
      page.drawLine({
        start: { x, y: yTop },
        end: { x, y: y2 },
        thickness: 0.8,
        color: lineaBorde,
      });
    });

    // Columnas por periodo
    d.periodos.forEach((p, idx) => {
      const xP = xPeriodos + idx * wPeriodo;
      const xPFin = xP + wPeriodo;

      // Nivel 1: Nombre del periodo
      const nombreP = p.nombre.length > 15 ? p.nombre.replace(/Bimestre/i, "Bim.") : p.nombre;
      centrado(page, nombreP, xP + wPeriodo / 2, y1 + 5, b, 8, azulInstitucional);

      // Nivel 2: Subcolumnas (Zona, Eval, Total)
      const xZ = xP;
      const xE = xZ + wZona;
      const xT = xE + wExamen;
      const ySub = y2 + 4;

      centrado(page, "Zona", xZ + wZona / 2, ySub, b, 7, gris);
      centrado(page, "Eval", xE + wExamen / 2, ySub, b, 7, gris);
      centrado(page, "Total", xT + wTotal / 2, ySub, b, 7.5, azulInstitucional);

      // Líneas verticales internas del periodo
      page.drawLine({ start: { x: xE, y: y1 }, end: { x: xE, y: y2 }, thickness: 0.4, color: grisClaro });
      page.drawLine({ start: { x: xT, y: y1 }, end: { x: xT, y: y2 }, thickness: 0.4, color: grisClaro });

      // Línea divisora entre periodos
      if (idx < d.periodos.length - 1) {
        page.drawLine({
          start: { x: xPFin, y: yTop },
          end: { x: xPFin, y: y2 },
          thickness: 0.8,
          color: lineaBorde,
        });
      }
    });

    return y2;
  }

  function crearNuevaPagina(esPrimera: boolean): PDFPage {
    const page = doc.addPage([pageWidth, pageHeight]);

    if (esPrimera) {
      let y = 578;

      // Encabezado institucional
      t(page, d.colegio.nombre, margenX, y, b, 14, azulInstitucional);
      derecha(page, "CUADRO DE CALIFICACIONES", pageWidth - margenX, y, b, 12, azulInstitucional);

      const sub = [d.colegio.direccion, d.colegio.telefono && `Tel. ${d.colegio.telefono}`]
        .filter(Boolean)
        .join("  |  ");
      if (sub) t(page, sub, margenX, y - 13, f, 8, gris);
      derecha(
        page,
        `Fecha de emisión: ${fechaHoraGT(d.fechaGeneracion)}`,
        pageWidth - margenX,
        y - 13,
        f,
        8,
        gris,
      );

      y -= 25;
      page.drawLine({
        start: { x: margenX, y },
        end: { x: pageWidth - margenX, y },
        thickness: 0.8,
        color: lineaBorde,
      });

      // Panel con metadatos del curso
      y -= 14;
      t(page, "Curso:", margenX, y, b, 8.5);
      t(page, d.curso, margenX + 38, y, f, 8.5);

      t(page, "Grado y Sección:", margenX + 220, y, b, 8.5);
      t(page, `${d.grado} "${d.seccion}"`, margenX + 310, y, f, 8.5);

      t(page, "Ciclo Escolar:", margenX + 430, y, b, 8.5);
      t(page, String(d.ciclo), margenX + 495, y, f, 8.5);

      y -= 12;
      t(page, "Docente:", margenX, y, b, 8.5);
      t(page, d.maestro, margenX + 45, y, f, 8.5);

      t(page, "Nota mínima de aprobación:", margenX + 220, y, b, 8.5);
      t(page, `${d.colegio.notaMinima} pts`, margenX + 360, y, f, 8.5);

      t(page, "Total alumnos:", margenX + 430, y, b, 8.5);
      t(page, String(d.alumnos.length), margenX + 505, y, f, 8.5);

      y -= 18;
      currentY = dibujarCabeceraTabla(page, y);
    } else {
      let y = 580;
      t(
        page,
        `CUADRO DE CALIFICACIONES (Continuación) · ${d.curso} · ${d.grado} "${d.seccion}" · Ciclo ${d.ciclo}`,
        margenX,
        y,
        b,
        9.5,
        azulInstitucional,
      );
      derecha(
        page,
        `Docente: ${d.maestro}`,
        pageWidth - margenX,
        y,
        f,
        8,
        gris,
      );

      y -= 14;
      currentY = dibujarCabeceraTabla(page, y);
    }

    return page;
  }

  // Inicializa la primera página
  currentPage = crearNuevaPagina(true);

  // Dibuja las filas de los alumnos
  d.alumnos.forEach((alumno, idx) => {
    // Si no cabe la siguiente fila, crea una nueva página con la cabecera
    if (currentY - altoFila < margenInferior) {
      currentPage = crearNuevaPagina(false);
    }

    const yFila = currentY - altoFila;

    // Fondo cebra alternado para facilitar lectura
    if (idx % 2 === 1) {
      currentPage.drawRectangle({
        x: margenX,
        y: yFila,
        width: tablaAncho,
        height: altoFila,
        color: bgFilaPar,
      });
    }

    // Línea horizontal inferior
    currentPage.drawLine({
      start: { x: margenX, y: yFila },
      end: { x: pageWidth - margenX, y: yFila },
      thickness: 0.4,
      color: grisClaro,
    });

    const yTexto = yFila + 4;

    // 1. Correlativo No.
    centrado(currentPage, String(idx + 1), xNo + wNo / 2, yTexto, f, 7.5, gris);

    // 2. Carnet
    centrado(currentPage, alumno.carnet, xCarnet + wCarnet / 2, yTexto, f, 7.5, oscuro);

    // 3. Apellidos y Nombres
    const nombreAjustado = recortar(alumno.nombreCompleto, f, 8, wAlumno - 10);
    t(currentPage, nombreAjustado, xAlumno + 5, yTexto, f, 8, oscuro);

    // 4. Periodos
    d.periodos.forEach((p, pIdx) => {
      const notaP = alumno.notasPorPeriodo[pIdx];
      const xP = xPeriodos + pIdx * wPeriodo;
      const xZ = xP;
      const xE = xZ + wZona;
      const xT = xE + wExamen;

      // Zona
      centrado(
        currentPage,
        fmtNota(notaP?.zona),
        xZ + wZona / 2,
        yTexto,
        f,
        7.5,
        notaP?.zona == null ? gris : oscuro,
      );

      // Evaluación
      centrado(
        currentPage,
        fmtNota(notaP?.examen),
        xE + wExamen / 2,
        yTexto,
        f,
        7.5,
        notaP?.examen == null ? gris : oscuro,
      );

      // Total
      const totalColor =
        notaP?.total == null
          ? gris
          : notaP.total < d.colegio.notaMinima
            ? rojoReprobado
            : oscuro;
      centrado(
        currentPage,
        fmtNota(notaP?.total),
        xT + wTotal / 2,
        yTexto,
        b,
        8,
        totalColor,
      );

      // Líneas verticales tenues entre columnas de datos
      currentPage.drawLine({ start: { x: xE, y: yFila }, end: { x: xE, y: currentY }, thickness: 0.3, color: grisClaro });
      currentPage.drawLine({ start: { x: xT, y: yFila }, end: { x: xT, y: currentY }, thickness: 0.3, color: grisClaro });

      if (pIdx < d.periodos.length - 1) {
        currentPage.drawLine({
          start: { x: xP + wPeriodo, y: yFila },
          end: { x: xP + wPeriodo, y: currentY },
          thickness: 0.5,
          color: lineaBorde,
        });
      }
    });

    // 5. Promedio Final
    const promColor =
      alumno.promedio == null
        ? gris
        : alumno.promedio < d.colegio.notaMinima
          ? rojoReprobado
          : verdeAprobado;

    centrado(
      currentPage,
      fmtNota(alumno.promedio),
      xPromedio + wPromedio / 2,
      yTexto,
      b,
      8.5,
      promColor,
    );

    // Líneas divisoras verticales fijas
    [xCarnet, xAlumno, xPeriodos, xPromedio, margenX, pageWidth - margenX].forEach((x) => {
      currentPage.drawLine({
        start: { x, y: yFila },
        end: { x, y: currentY },
        thickness: 0.5,
        color: lineaBorde,
      });
    });

    currentY = yFila;
  });

  // Si no hay alumnos inscritos
  if (d.alumnos.length === 0) {
    const yFila = currentY - altoFila * 2;
    centrado(
      currentPage,
      "No hay alumnos inscritos o activos en esta sección.",
      pageWidth / 2,
      yFila + 10,
      f,
      9,
      gris,
    );
    currentPage.drawLine({
      start: { x: margenX, y: yFila },
      end: { x: pageWidth - margenX, y: yFila },
      thickness: 0.5,
      color: lineaBorde,
    });
    currentY = yFila;
  }

  // Dibuja el pie de página con número de página en todas las hojas
  const totalPages = doc.getPageCount();
  doc.getPages().forEach((p, idx) => {
    const yPie = 20;
    t(
      p,
      "Sistema de Control Escolar · Cuadro oficial de calificaciones del curso",
      margenX,
      yPie,
      f,
      7,
      gris,
    );
    derecha(
      p,
      `Página ${idx + 1} de ${totalPages}`,
      pageWidth - margenX,
      yPie,
      f,
      7.5,
      gris,
    );
  });

  return doc.save();
}

