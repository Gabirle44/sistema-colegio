export const num = (v: unknown): number => Number(String(v));

const r2 = (n: number) => Math.round(n * 100) / 100;

// 85 -> "85", 85.5 -> "85.5", 85.25 -> "85.25"
export function fmtNota(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return String(r2(n));
}

export function promedio(valores: (number | null)[]): number | null {
  const v = valores.filter((x): x is number => x !== null);
  if (v.length === 0) return null;
  return r2(v.reduce((s, x) => s + x, 0) / v.length);
}

export type Resultado = "APROBADO" | "REPROBADO" | "EN_PROCESO";

// Un curso solo se da por aprobado/reprobado cuando ya tiene nota en TODOS los periodos
export function resultadoCurso(valores: (number | null)[], minima: number): Resultado {
  if (valores.some((v) => v === null)) return "EN_PROCESO";
  const p = promedio(valores)!;
  return p >= minima ? "APROBADO" : "REPROBADO";
}

export const etiquetaResultado: Record<Resultado, string> = {
  APROBADO: "Aprobado",
  REPROBADO: "Reprobado",
  EN_PROCESO: "En proceso",
};

export const CONDUCTAS = ["Excelente", "Muy buena", "Buena", "Regular", "Deficiente"] as const;
