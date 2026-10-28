import { csvFila, fechaHoraGT } from "@/lib/cobros/utils";
import type { DatosCuadroNotas } from "./cuadro";

/**
 * Genera el archivo CSV con codificación UTF-8 y BOM (\uFEFF)
 * para apertura limpia e inmediata en Microsoft Excel en cualquier sistema operativo.
 */
export function generarCsvCuadroNotas(d: DatosCuadroNotas): string {
  const filas: unknown[][] = [
    ["INSTITUCIÓN:", d.colegio.nombre],
    ["CURSO:", d.curso],
    ["GRADO Y SECCIÓN:", `${d.grado} "${d.seccion}"`],
    ["DOCENTE:", d.maestro],
    ["CICLO ESCOLAR:", d.ciclo],
    ["FECHA DE GENERACIÓN:", fechaHoraGT(d.fechaGeneracion)],
    ["NOTA MÍNIMA DE APROBACIÓN:", d.colegio.notaMinima],
    [], // Separador
    [
      "No.",
      "Carnet",
      "Apellidos y Nombres",
      ...d.periodos.flatMap((p) => [
        `${p.nombre} - Zona`,
        `${p.nombre} - Examen`,
        `${p.nombre} - Total`,
      ]),
      "Promedio Final",
      "Estado",
    ],
  ];

  d.alumnos.forEach((a, idx) => {
    let estado = "En proceso";
    if (a.promedio !== null) {
      estado = a.promedio >= d.colegio.notaMinima ? "Aprobado" : "Reprobado";
    }

    filas.push([
      idx + 1,
      a.carnet,
      a.nombreCompleto,
      ...a.notasPorPeriodo.flatMap((np) => [
        np.zona != null ? np.zona : "",
        np.examen != null ? np.examen : "",
        np.total != null ? np.total : "",
      ]),
      a.promedio != null ? a.promedio : "",
      estado,
    ]);
  });

  // UTF-8 BOM (\uFEFF) para compatibilidad nativa con Excel
  return "\uFEFF" + filas.map(csvFila).join("\r\n");
}

