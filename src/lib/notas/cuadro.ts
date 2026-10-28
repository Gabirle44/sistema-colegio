import { prisma } from "@/lib/prisma";
import { obtenerConfig } from "@/lib/cobros/config";
import type { Actor } from "@/lib/notas/acceso";
import { num, promedio } from "@/lib/notas/calculo";

export class AutorizacionError extends Error {
  constructor(message = "No tienes autorización para acceder a este cuadro de notas.") {
    super(message);
    this.name = "AutorizacionError";
  }
}

export class RecursoNoEncontradoError extends Error {
  constructor(message = "Asignación no encontrada.") {
    super(message);
    this.name = "RecursoNoEncontradoError";
  }
}

export interface NotaPeriodoDetalle {
  periodoId: number;
  periodoNombre: string;
  zona: number | null;
  examen: number | null;
  total: number | null;
}

export interface AlumnoFilaCuadro {
  inscripcionId: number;
  carnet: string;
  apellidos: string;
  nombres: string;
  nombreCompleto: string;
  notasPorPeriodo: NotaPeriodoDetalle[];
  promedio: number | null;
}

export interface DatosCuadroNotas {
  colegio: {
    nombre: string;
    direccion?: string;
    telefono?: string;
    notaMinima: number;
  };
  curso: string;
  grado: string;
  seccion: string;
  ciclo: number;
  maestro: string;
  fechaGeneracion: Date;
  periodos: { id: number; numero: number; nombre: string }[];
  alumnos: AlumnoFilaCuadro[];
}

/**
 * Carga la información completa del cuadro de notas validando permisos de acceso.
 * Si el usuario es un maestro, se garantiza estrictamente que la asignación le pertenezca.
 */
export async function obtenerDatosCuadroNotas(
  asignacionId: number,
  actor: Actor,
): Promise<DatosCuadroNotas> {
  if (!Number.isInteger(asignacionId) || asignacionId <= 0) {
    throw new RecursoNoEncontradoError();
  }

  const asig = await prisma.asignacionCurso.findUnique({
    where: { id: asignacionId },
    include: {
      curso: true,
      maestro: true,
      seccion: {
        include: {
          grado: true,
          ciclo: true,
        },
      },
    },
  });

  if (!asig) {
    throw new RecursoNoEncontradoError();
  }

  // Regla de seguridad: el maestro solo puede ver las asignaciones de sus propios cursos
  if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) {
    throw new AutorizacionError();
  }

  const cfg = await obtenerConfig();

  const periodos = await prisma.periodo.findMany({
    where: { cicloId: asig.seccion.cicloId },
    orderBy: { numero: "asc" },
  });

  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      seccionId: asig.seccionId,
      cicloId: asig.seccion.cicloId,
      alumno: { activo: true },
    },
    include: {
      alumno: true,
      notas: { where: { cursoId: asig.cursoId } },
    },
    orderBy: [
      { alumno: { apellidos: "asc" } },
      { alumno: { nombres: "asc" } },
    ],
  });

  const alumnos: AlumnoFilaCuadro[] = inscripciones.map((ins) => {
    const notasPorPeriodo = periodos.map((p) => {
      const n = ins.notas.find((x) => x.periodoId === p.id);
      const zona = n?.zona != null ? num(n.zona) : n?.valor != null && n?.examen == null ? num(n.valor) : null;
      const examen = n?.examen != null ? num(n.examen) : null;
      const total =
        n?.valor != null
          ? num(n.valor)
          : zona != null || examen != null
            ? (zona ?? 0) + (examen ?? 0)
            : null;

      return {
        periodoId: p.id,
        periodoNombre: p.nombre,
        zona,
        examen,
        total,
      };
    });

    const notasTotales = notasPorPeriodo.map((np) => np.total);
    const prom = promedio(notasTotales);

    return {
      inscripcionId: ins.id,
      carnet: ins.alumno.carnet,
      apellidos: ins.alumno.apellidos,
      nombres: ins.alumno.nombres,
      nombreCompleto: `${ins.alumno.apellidos}, ${ins.alumno.nombres}`,
      notasPorPeriodo,
      promedio: prom,
    };
  });

  return {
    colegio: {
      nombre: cfg.nombreColegio,
      direccion: cfg.direccion,
      telefono: cfg.telefono,
      notaMinima: cfg.notaMinima,
    },
    curso: asig.curso.nombre,
    grado: asig.seccion.grado.nombre,
    seccion: asig.seccion.nombre,
    ciclo: asig.seccion.ciclo.anio,
    maestro: `${asig.maestro.nombres} ${asig.maestro.apellidos}`,
    fechaGeneracion: new Date(),
    periodos: periodos.map((p) => ({ id: p.id, numero: p.numero, nombre: p.nombre })),
    alumnos,
  };
}

