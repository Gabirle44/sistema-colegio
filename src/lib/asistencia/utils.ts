import type { EstadoAsistencia } from "@prisma/client";

export const ESTADOS: readonly EstadoAsistencia[] = ["PRESENTE", "TARDE", "EXCUSA", "AUSENTE"];

export const ETIQUETA: Record<EstadoAsistencia, string> = {
  PRESENTE: "Presente", TARDE: "Tarde", EXCUSA: "Excusa", AUSENTE: "Ausente",
};
export const LETRA: Record<EstadoAsistencia, string> = { PRESENTE: "P", TARDE: "T", EXCUSA: "E", AUSENTE: "A" };

export const esFechaIso = (t: string | undefined): t is string => !!t && /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`));
export const fechaDb = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export function sumarDias(iso: string, n: number): string {
  const d = fechaDb(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const nombreDia = (iso: string) => DIAS[fechaDb(iso).getUTCDay()];
export const esFinDeSemana = (iso: string) => [0, 6].includes(fechaDb(iso).getUTCDay());
