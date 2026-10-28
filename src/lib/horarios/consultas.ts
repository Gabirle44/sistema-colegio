import { prisma } from "@/lib/prisma";
import type { BloqueHorarioDetalle } from "./types";

export async function obtenerDatosHorariosAdmin(seccionIdParam?: number) {
  const ciclo = await prisma.cicloEscolar.findFirst({
    where: { activo: true },
  });

  if (!ciclo) {
    return {
      ciclo: null,
      secciones: [],
      seccionSeleccionada: null,
      asignaciones: [],
      bloques: [] as BloqueHorarioDetalle[],
    };
  }

  // Lista de todas las secciones del ciclo
  const secciones = await prisma.seccion.findMany({
    where: { cicloId: ciclo.id },
    include: {
      grado: true,
    },
    orderBy: [
      { grado: { orden: "asc" } },
      { nombre: "asc" },
    ],
  });

  // Si no se especificó sección, tomar la primera de la lista (si existe)
  const seccionActivaId = seccionIdParam ?? secciones[0]?.id;

  if (!seccionActivaId) {
    return {
      ciclo,
      secciones,
      seccionSeleccionada: null,
      asignaciones: [],
      bloques: [] as BloqueHorarioDetalle[],
    };
  }

  const seccionSeleccionada = secciones.find((s) => s.id === seccionActivaId) ?? null;

  // Cursos asignados a esta sección
  const asignaciones = await prisma.asignacionCurso.findMany({
    where: { seccionId: seccionActivaId },
    include: {
      curso: true,
      maestro: true,
    },
    orderBy: {
      curso: { nombre: "asc" },
    },
  });

  // Bloques de horario ya configurados para esta sección
  const bloquesDb = await prisma.bloqueHorario.findMany({
    where: {
      asignacion: { seccionId: seccionActivaId },
    },
    include: {
      asignacion: {
        include: {
          curso: true,
          maestro: true,
          seccion: {
            include: { grado: true },
          },
        },
      },
    },
    orderBy: [
      { diaSemana: "asc" },
      { horaInicio: "asc" },
    ],
  });

  const bloques: BloqueHorarioDetalle[] = bloquesDb.map((b) => ({
    id: b.id,
    asignacionId: b.asignacionId,
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFin: b.horaFin,
    curso: {
      id: b.asignacion.curso.id,
      nombre: b.asignacion.curso.nombre,
    },
    maestro: {
      id: b.asignacion.maestro.id,
      nombres: b.asignacion.maestro.nombres,
      apellidos: b.asignacion.maestro.apellidos,
    },
    seccion: {
      id: b.asignacion.seccion.id,
      nombre: b.asignacion.seccion.nombre,
      grado: {
        id: b.asignacion.seccion.grado.id,
        nombre: b.asignacion.seccion.grado.nombre,
        orden: b.asignacion.seccion.grado.orden,
      },
    },
  }));

  return {
    ciclo,
    secciones,
    seccionSeleccionada,
    asignaciones,
    bloques,
  };
}

export async function obtenerHorarioMaestro(maestroId: number) {
  const ciclo = await prisma.cicloEscolar.findFirst({
    where: { activo: true },
  });

  if (!ciclo) {
    return {
      ciclo: null,
      maestro: null,
      bloques: [] as BloqueHorarioDetalle[],
    };
  }

  const maestro = await prisma.maestro.findUnique({
    where: { id: maestroId },
    include: { usuario: true },
  });

  const bloquesDb = await prisma.bloqueHorario.findMany({
    where: {
      asignacion: {
        maestroId,
        seccion: { cicloId: ciclo.id },
      },
    },
    include: {
      asignacion: {
        include: {
          curso: true,
          maestro: true,
          seccion: {
            include: { grado: true },
          },
        },
      },
    },
    orderBy: [
      { diaSemana: "asc" },
      { horaInicio: "asc" },
    ],
  });

  const bloques: BloqueHorarioDetalle[] = bloquesDb.map((b) => ({
    id: b.id,
    asignacionId: b.asignacionId,
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFin: b.horaFin,
    curso: {
      id: b.asignacion.curso.id,
      nombre: b.asignacion.curso.nombre,
    },
    maestro: {
      id: b.asignacion.maestro.id,
      nombres: b.asignacion.maestro.nombres,
      apellidos: b.asignacion.maestro.apellidos,
    },
    seccion: {
      id: b.asignacion.seccion.id,
      nombre: b.asignacion.seccion.nombre,
      grado: {
        id: b.asignacion.seccion.grado.id,
        nombre: b.asignacion.seccion.grado.nombre,
        orden: b.asignacion.seccion.grado.orden,
      },
    },
  }));

  return {
    ciclo,
    maestro,
    bloques,
  };
}
