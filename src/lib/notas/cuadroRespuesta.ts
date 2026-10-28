import { notFound } from "next/navigation";
import { requireActor } from "@/lib/notas/acceso";
import {
  AutorizacionError,
  RecursoNoEncontradoError,
  obtenerDatosCuadroNotas,
} from "./cuadro";
import { generarPdfCuadroNotas } from "./pdfCuadroNotas";
import { generarCsvCuadroNotas } from "./csvCuadroNotas";

function limpiarNombreArchivo(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}

/**
 * Genera la respuesta HTTP para la descarga del Cuadro de Notas en formato PDF.
 */
export async function respuestaCuadroNotasPdf(asignacionId: number): Promise<Response> {
  const actor = await requireActor();

  try {
    const datos = await obtenerDatosCuadroNotas(asignacionId, actor);
    const pdfBytes = await generarPdfCuadroNotas(datos);

    const baseNombre = `cuadro-notas-${datos.curso}-${datos.grado}-${datos.seccion}`;
    const filename = `${limpiarNombreArchivo(baseNombre)}.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof RecursoNoEncontradoError) {
      notFound();
    }
    if (error instanceof AutorizacionError) {
      return new Response("No tienes autorización para acceder a las notas de este curso.", {
        status: 403,
      });
    }
    throw error;
  }
}

/**
 * Genera la respuesta HTTP para la exportación del Cuadro de Notas en formato CSV para Excel.
 */
export async function respuestaCuadroNotasCsv(asignacionId: number): Promise<Response> {
  const actor = await requireActor();

  try {
    const datos = await obtenerDatosCuadroNotas(asignacionId, actor);
    const csvContent = generarCsvCuadroNotas(datos);

    const baseNombre = `cuadro-notas-${datos.curso}-${datos.grado}-${datos.seccion}`;
    const filename = `${limpiarNombreArchivo(baseNombre)}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof RecursoNoEncontradoError) {
      notFound();
    }
    if (error instanceof AutorizacionError) {
      return new Response("No tienes autorización para acceder a las notas de este curso.", {
        status: 403,
      });
    }
    throw error;
  }
}

