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
  monto: number; // centavos
  fecha: Date;
  observaciones: string | null;
  registradoPor: string;
};

export async function pdfComprobanteMaestro(d: DatosComprobante): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 396]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const gris = rgb(0.4, 0.45, 0.5);
  const oscuro = rgb(0.1, 0.1, 0.15);
  const t = (s: string, x: number, y: number, font = f, size = 10, color = oscuro) =>
    page.drawText(limpio(s), { x, y, size, font, color });
  const der = (s: string, x: number, y: number, font = f, size = 10) => {
    const l = limpio(s);
    page.drawText(l, { x: x - font.widthOfTextAtSize(l, size), y, size, font, color: oscuro });
  };

  let y = 356;
  t(d.colegio.nombre, 40, y, b, 16);
  const sub = [d.colegio.direccion, d.colegio.telefono && `Tel. ${d.colegio.telefono}`].filter(Boolean).join("  |  ");
  if (sub) t(sub, 40, y - 14, f, 8.5, gris);
  der("COMPROBANTE DE PAGO", 572, y, b, 13);
  der(`No. PM-${String(d.numero).padStart(6, "0")}`, 572, y - 16, b, 12);
  der(`Fecha: ${fechaHoraGT(d.fecha)}`, 572, y - 30, f, 9);
  y -= 52;
  page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 1, color: rgb(0.75, 0.78, 0.82) });
  y -= 26;

  t("Pagado a:", 40, y, b); t(d.maestro, 110, y);
  y -= 18;
  t("Concepto:", 40, y, b); t(`Salario correspondiente a ${mayuscula(nombreMes(d.mes))} de ${d.anio}`, 110, y);
  y -= 30;
  page.drawRectangle({ x: 40, y: y - 8, width: 532, height: 30, color: rgb(0.93, 0.95, 0.98) });
  t("TOTAL PAGADO", 50, y + 2, b, 11);
  der(quetzales(d.monto), 562, y + 2, b, 14);
  y -= 26;
  t(`Son: ${montoALetras(d.monto)}`, 46, y, f, 9.5);
  y -= 18;
  if (d.observaciones) t(`Observaciones: ${d.observaciones}`, 46, y, f, 9, gris);

  page.drawLine({ start: { x: 60, y: 78 }, end: { x: 250, y: 78 }, thickness: 0.5, color: gris });
  t("Firma del maestro (recibí conforme)", 70, 66, f, 8.5, gris);
  page.drawLine({ start: { x: 360, y: 78 }, end: { x: 552, y: 78 }, thickness: 0.5, color: gris });
  t("Firma y sello del colegio", 400, 66, f, 8.5, gris);
  t(`Registrado por: ${d.registradoPor}`, 40, 36, f, 8.5, gris);
  return doc.save();
}
