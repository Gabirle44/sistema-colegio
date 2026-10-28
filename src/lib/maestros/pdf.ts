import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { montoALetras } from "@/lib/cobros/letras";
import { fechaHoraGT, mayuscula, nombreMes, quetzales } from "@/lib/cobros/utils";

const limpio = (s: string) => s.replace(/[–—]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

export type DatosComprobante = {
  colegio: { nombre: string; direccion: string; telefono: string };
  numero: number;
  maestro: string;
  mes: number;
  anio: number;
  monto: number; // Líquido en centavos
  sueldoBase?: number; // centavos
  bonificacion?: number; // centavos
  horasExtra?: number; // centavos
  igss?: number; // centavos
  descuentos?: number; // centavos
  fecha: Date;
  observaciones: string | null;
  registradoPor: string;
};

export async function pdfComprobanteMaestro(d: DatosComprobante): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Formato media carta (612 x 460) para albergar con holgura el desglose de planilla y firmas
  const page = doc.addPage([612, 460]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const gris = rgb(0.4, 0.45, 0.5);
  const oscuro = rgb(0.1, 0.1, 0.15);
  const azulHeader = rgb(0.15, 0.25, 0.45);

  const t = (s: string, x: number, y: number, font = f, size = 10, color = oscuro) =>
    page.drawText(limpio(s), { x, y, size, font, color });
  const der = (s: string, x: number, y: number, font = f, size = 10, color = oscuro) => {
    const l = limpio(s);
    page.drawText(l, { x: x - font.widthOfTextAtSize(l, size), y, size, font, color });
  };

  let y = 420;

  // 1. Encabezado de la Institución
  t(d.colegio.nombre, 40, y, b, 15, azulHeader);
  const sub = [d.colegio.direccion, d.colegio.telefono && `Tel. ${d.colegio.telefono}`].filter(Boolean).join("  |  ");
  if (sub) t(sub, 40, y - 14, f, 8.5, gris);

  der("COMPROBANTE DE PAGO", 572, y, b, 12, azulHeader);
  der(`No. PM-${String(d.numero).padStart(6, "0")}`, 572, y - 15, b, 11);
  der(`Fecha de emisión: ${fechaHoraGT(d.fecha)}`, 572, y - 28, f, 8.5, gris);

  y -= 42;
  page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 1, color: rgb(0.75, 0.8, 0.85) });
  y -= 20;

  // 2. Información del Docente y Periodo
  t("Docente:", 40, y, b, 9.5);
  t(d.maestro, 95, y, f, 9.5);

  t("Periodo:", 340, y, b, 9.5);
  t(`${mayuscula(nombreMes(d.mes))} de ${d.anio}`, 395, y, f, 9.5);

  y -= 25;

  // 3. Tabla de Desglose de Planilla (Ingresos vs Descuentos)
  const sueldoBase = d.sueldoBase ?? d.monto;
  const bonificacion = d.bonificacion ?? 0;
  const horasExtra = d.horasExtra ?? 0;
  const igss = d.igss ?? 0;
  const descuentos = d.descuentos ?? 0;

  const totalIngresos = sueldoBase + bonificacion + horasExtra;
  const totalDescuentos = igss + descuentos;

  // Cabecera de la tabla
  page.drawRectangle({ x: 40, y: y - 16, width: 260, height: 20, color: rgb(0.94, 0.96, 0.98) });
  t("INGRESOS / DEVENGADO", 48, y - 11, b, 9, azulHeader);
  der("MONTO", 292, y - 11, b, 9, azulHeader);

  page.drawRectangle({ x: 312, y: y - 16, width: 260, height: 20, color: rgb(0.98, 0.94, 0.94) });
  t("DESCUENTOS / DEDUCCIONES", 320, y - 11, b, 9, rgb(0.65, 0.15, 0.15));
  der("MONTO", 564, y - 11, b, 9, rgb(0.65, 0.15, 0.15));

  y -= 30;

  // Fila 1: Sueldo base ordinario vs Cuota laboral IGSS
  t("Sueldo Base Ordinario", 48, y, f, 8.5);
  der(quetzales(sueldoBase), 292, y, f, 8.5);

  t("Cuota Laboral IGSS (4.83%)", 320, y, f, 8.5);
  der(`-${quetzales(igss)}`, 564, y, f, 8.5);

  y -= 15;

  // Fila 2: Bonificación incentivo (Decreto 37-2001) vs Anticipos y Préstamos
  t("Bonificación Incentivo (Dto. 37-2001)", 48, y, f, 8.5);
  der(quetzales(bonificacion), 292, y, f, 8.5);

  t("Anticipos / Descuentos varios", 320, y, f, 8.5);
  der(`-${quetzales(descuentos)}`, 564, y, f, 8.5);

  y -= 15;

  // Fila 3: Horas Extraordinarias
  t("Horas Extraordinarias", 48, y, f, 8.5);
  der(quetzales(horasExtra), 292, y, f, 8.5);

  t("Otras deducciones", 320, y, f, 8.5, gris);
  der("Q0.00", 564, y, f, 8.5, gris);

  y -= 18;
  page.drawLine({ start: { x: 48, y }, end: { x: 292, y }, thickness: 0.5, color: rgb(0.8, 0.85, 0.9) });
  page.drawLine({ start: { x: 320, y }, end: { x: 564, y }, thickness: 0.5, color: rgb(0.9, 0.8, 0.8) });

  y -= 12;

  // Subtotales
  t("Total Devengado:", 48, y, b, 8.5);
  der(quetzales(totalIngresos), 292, y, b, 8.5);

  t("Total Descuentos:", 320, y, b, 8.5);
  der(`-${quetzales(totalDescuentos)}`, 564, y, b, 8.5, rgb(0.7, 0.15, 0.15));

  y -= 32;

  // 4. Bloque Destacado de Líquido a Recibir
  page.drawRectangle({ x: 40, y: y - 8, width: 532, height: 32, color: rgb(0.92, 0.96, 0.93) });
  page.drawRectangle({ x: 40, y: y - 8, width: 532, height: 32, borderColor: rgb(0.3, 0.65, 0.4), borderWidth: 1 });

  t("LÍQUIDO A RECIBIR (NETO A PAGAR):", 52, y + 3, b, 11, rgb(0.1, 0.45, 0.2));
  der(quetzales(d.monto), 562, y + 2, b, 14, rgb(0.08, 0.42, 0.18));

  y -= 24;
  t(`Son: ${montoALetras(d.monto)}`, 46, y, f, 8.5);

  y -= 14;
  if (d.observaciones) {
    t(`Observaciones: ${d.observaciones}`, 46, y, f, 8, gris);
    y -= 14;
  }

  // 5. Firmas y Pie de Página
  const yFirmas = 60;
  page.drawLine({ start: { x: 60, y: yFirmas }, end: { x: 240, y: yFirmas }, thickness: 0.5, color: gris });
  t("Firma del maestro (recibí conforme)", 75, yFirmas - 12, f, 8, gris);

  page.drawLine({ start: { x: 370, y: yFirmas }, end: { x: 550, y: yFirmas }, thickness: 0.5, color: gris });
  t("Firma y sello de Dirección / Administración", 375, yFirmas - 12, f, 8, gris);

  t(`Registrado en sistema por: ${d.registradoPor}`, 40, 24, f, 7.5, gris);

  return doc.save();
}
