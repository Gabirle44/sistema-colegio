export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const nombreMes = (m: number) => MESES[(((m - 1) % 12) + 12) % 12];
export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Dinero: se calcula en centavos (enteros) para evitar errores de decimales ──
export const aCentavos = (v: unknown): number => Math.round(Number(String(v)) * 100);
export const deCentavos = (c: number): string => (c / 100).toFixed(2);

export function quetzales(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const entero = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negativo ? "-" : ""}Q${entero}.${String(abs % 100).padStart(2, "0")}`;
}

// Convierte lo que escribió el usuario ("125.50" o "125,50") a centavos. null = inválido.
export function parseCentavos(
  v: FormDataEntryValue | null,
  opciones: { vacioEsCero?: boolean } = {},
): number | null {
  const t = String(v ?? "").trim().replace(",", ".");
  if (t === "") return opciones.vacioEsCero ? 0 : null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// ── Fechas: Guatemala es UTC-6 todo el año (sin horario de verano) ──
const GT_MS = 6 * 3_600_000;
export const diaMs = 86_400_000;

// Fecha de hoy en Guatemala, como medianoche UTC (sirve para comparar con vencimientos)
export function hoyGT(): Date {
  const d = new Date(Date.now() - GT_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
export const isoHoyGT = () => hoyGT().toISOString().slice(0, 10);

// Hora actual (0-23) en Guatemala. Vive aqui, junto al resto del manejo de
// zona horaria, para no leer el reloj dentro del render de un componente.
export const horaGT = (): number => new Date(Date.now() - GT_MS).getUTCHours();

// Inicio (00:00 hora de Guatemala) de una fecha "AAAA-MM-DD"
export const inicioDiaGT = (iso: string) => new Date(`${iso}T06:00:00.000Z`);

const dos = (n: number) => String(n).padStart(2, "0");

// Para fechas guardadas a medianoche UTC (vencimientos)
export const fechaCorta = (d: Date) =>
  `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

// Para marcas de tiempo (recibos, bitácora), mostradas en hora de Guatemala
export function fechaHoraGT(d: Date): string {
  const l = new Date(d.getTime() - GT_MS);
  return `${dos(l.getUTCDate())}/${dos(l.getUTCMonth() + 1)}/${l.getUTCFullYear()} ${dos(l.getUTCHours())}:${dos(l.getUTCMinutes())}`;
}
export function fechaGT(d: Date): string {
  return fechaHoraGT(d).slice(0, 10);
}
export function mesGT(d: Date): string {
  const l = new Date(d.getTime() - GT_MS);
  return `${l.getUTCFullYear()}-${dos(l.getUTCMonth() + 1)}`;
}

export function esVencido(vencimiento: Date, diasGracia: number): boolean {
  const v = Date.UTC(vencimiento.getUTCFullYear(), vencimiento.getUTCMonth(), vencimiento.getUTCDate());
  return Math.floor((hoyGT().getTime() - v) / diaMs) > diasGracia;
}

// ── Varios ──
export const numeroRecibo = (r: { serie: string; numero: number }) =>
  `${r.serie}-${String(r.numero).padStart(6, "0")}`;

export function telefonoWhatsApp(tel?: string | null): string | null {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.length === 8) return `502${d}`;
  if (d.length === 11 && d.startsWith("502")) return d;
  return d.length >= 8 ? d : null;
}

export function enlaceWhatsApp(tel: string | null | undefined, mensaje: string): string | null {
  const numero = telefonoWhatsApp(tel);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null;
}

export function csvCelda(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvFila = (celdas: unknown[]) => celdas.map(csvCelda).join(",");
