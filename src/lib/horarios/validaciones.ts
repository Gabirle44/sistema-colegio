import { prisma } from "@/lib/prisma";
import { DIAS_SEMANA, type ConflictoHorario } from "./types";

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function esFormatoHoraValido(hora: string): boolean {
  return FORMATO_HORA.test(hora);
}

export function haySolapamiento(
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string,
): boolean {
  return inicioA < finB && inicioB < finA;
}

export function nombreDia(diaSemana: number): string {
  const d = DIAS_SEMANA.find((item) => item.id === diaSemana);
  return d ? d.nombre : `Día ${diaSemana}`;
}

export async function detectarChoques({
  asignacionId,
  diaSemana,
  horaInicio,
  horaFin,
  ignorarBloqueId,
}: {
  asignacionId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  ignorarBloqueId?: number;
}): Promise<ConflictoHorario | null> {
  // 1. Obtener datos de la asignación objetivo
  const asignacion = await prisma.asignacionCurso.findUnique({
    where: { id: asignacionId },
    include: {
      curso: true,
      maestro: true,
      seccion: {
        include: { grado: true },
      },
    },
  });

  if (!asignacion) {
    return {
      tipo: "SECCION",
      mensaje: "La asignación de curso no existe.",
    };
  }

  const diaTexto = nombreDia(diaSemana);

  // 2. Verificar choque de SECCIÓN (dos cursos en la misma sección a la misma hora)
  const bloquesSeccion = await prisma.bloqueHorario.findMany({
    where: {
      id: ignorarBloqueId ? { not: ignorarBloqueId } : undefined,
      diaSemana,
      asignacion: {
        seccionId: asignacion.seccionId,
      },
    },
    include: {
      asignacion: {
        include: { curso: true, maestro: true },
      },
    },
  });

  for (const bloque of bloquesSeccion) {
    if (haySolapamiento(horaInicio, horaFin, bloque.horaInicio, bloque.horaFin)) {
      return {
        tipo: "SECCION",
        mensaje: `Choque de sección: ${asignacion.seccion.grado.nombre} ${asignacion.seccion.nombre} ya tiene asignada la materia "${bloque.asignacion.curso.nombre}" el ${diaTexto} de ${bloque.horaInicio} a ${bloque.horaFin}.`,
      };
    }
  }

  // 3. Verificar choque de MAESTRO (el maestro en dos lugares al mismo tiempo en el mismo ciclo escolar)
  const bloquesMaestro = await prisma.bloqueHorario.findMany({
    where: {
      id: ignorarBloqueId ? { not: ignorarBloqueId } : undefined,
      diaSemana,
      asignacion: {
        maestroId: asignacion.maestroId,
        seccion: {
          cicloId: asignacion.seccion.cicloId,
        },
      },
    },
    include: {
      asignacion: {
        include: {
          curso: true,
          seccion: { include: { grado: true } },
        },
      },
    },
  });

  for (const bloque of bloquesMaestro) {
    if (haySolapamiento(horaInicio, horaFin, bloque.horaInicio, bloque.horaFin)) {
      const profe = `${asignacion.maestro.nombres} ${asignacion.maestro.apellidos}`;
      const secDestino = `${bloque.asignacion.seccion.grado.nombre} ${bloque.asignacion.seccion.nombre}`;
      return {
        tipo: "MAESTRO",
        mensaje: `Choque de maestro: El docente ${profe} ya tiene programada la clase de "${bloque.asignacion.curso.nombre}" en ${secDestino} el ${diaTexto} de ${bloque.horaInicio} a ${bloque.horaFin}.`,
      };
    }
  }

  return null;
}
