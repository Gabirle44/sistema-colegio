import { prisma } from "@/lib/prisma";
import { resumenCuenta } from "@/lib/cobros/cargos";
import { fmtNota, num, promedio, resultadoCurso, type Resultado } from "./calculo";

export type CursoBoleta = {
  cursoId: number;
  nombre: string;
  notas: (number | null)[]; // en el orden de los periodos
  promedio: number | null;
  resultado: Resultado;
};

export type DatosPeriodo = { inasistencias: number; conducta: string | null; comentario: string | null };

export type Boleta = {
  inscripcionId: number;
  alumno: { nombre: string; carnet: string; encargado: string; telefono: string | null };
  grado: string;
  seccion: string;
  ciclo: number;
  periodos: { id: number; nombre: string; abierto: boolean }[];
  cursos: CursoBoleta[];
  datosPeriodo: DatosPeriodo[]; // mismo orden que periodos
  promedioGeneral: number | null;
  resultado: Resultado;
  totalInasistencias: number;
  saldoVencido: number; // centavos
  cuotasVencidas: number;
};

export type Ajustes = { notaMinima: number; bloquearBoletaMora: boolean; diasGracia: number; nombreColegio: string; direccion: string; telefono: string };

// Carga las boletas de varias inscripciones con pocas consultas (sirve para una o para toda una sección)
export async function cargarBoletas(inscripcionIds: number[]): Promise<{ boletas: Boleta[]; ajustes: Ajustes }> {
  const cfg = await prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const ajustes: Ajustes = {
    notaMinima: cfg.notaMinima, bloquearBoletaMora: cfg.bloquearBoletaMora, diasGracia: cfg.diasGracia,
    nombreColegio: cfg.nombreColegio, direccion: cfg.direccion, telefono: cfg.telefono,
  };
  if (inscripcionIds.length === 0) return { boletas: [], ajustes };

  const inscripciones = await prisma.inscripcion.findMany({
    where: { id: { in: inscripcionIds } },
    include: {
      alumno: true, ciclo: true, seccion: { include: { grado: true } }, cargos: true,
      notas: true, boletas: true,
    },
  });
  if (inscripciones.length === 0) return { boletas: [], ajustes };

  const cicloIds = [...new Set(inscripciones.map((i) => i.cicloId))];
  const gradoIds = [...new Set(inscripciones.map((i) => i.seccion.gradoId))];
  const [periodos, cursos] = await Promise.all([
    prisma.periodo.findMany({ where: { cicloId: { in: cicloIds } }, orderBy: [{ cicloId: "asc" }, { numero: "asc" }] }),
    prisma.curso.findMany({ where: { gradoId: { in: gradoIds } }, orderBy: [{ nombre: "asc" }] }),
  ]);

  const boletas = inscripciones.map((ins): Boleta => {
    const ps = periodos.filter((p) => p.cicloId === ins.cicloId);
    const cs = cursos.filter((c) => c.gradoId === ins.seccion.gradoId);
    const cursosBoleta = cs.map((c): CursoBoleta => {
      const notas = ps.map((p) => {
        const n = ins.notas.find((x) => x.cursoId === c.id && x.periodoId === p.id);
        return n ? num(n.valor) : null;
      });
      return { cursoId: c.id, nombre: c.nombre, notas, promedio: promedio(notas), resultado: resultadoCurso(notas, cfg.notaMinima) };
    });
    const resultados = cursosBoleta.map((c) => c.resultado);
    const resultado: Resultado = resultados.includes("REPROBADO")
      ? "REPROBADO"
      : cursosBoleta.length > 0 && resultados.every((r) => r === "APROBADO") ? "APROBADO" : "EN_PROCESO";
    const datosPeriodo = ps.map((p): DatosPeriodo => {
      const b = ins.boletas.find((x) => x.periodoId === p.id);
      return { inasistencias: b?.inasistencias ?? 0, conducta: b?.conducta ?? null, comentario: b?.comentario ?? null };
    });
    const cuenta = resumenCuenta(ins.cargos, cfg.diasGracia);
    return {
      inscripcionId: ins.id,
      alumno: {
        nombre: `${ins.alumno.nombres} ${ins.alumno.apellidos}`, carnet: ins.alumno.carnet,
        encargado: ins.alumno.encargadoNombre, telefono: ins.alumno.encargadoTelefono ?? ins.alumno.telefono,
      },
      grado: ins.seccion.grado.nombre, seccion: ins.seccion.nombre, ciclo: ins.ciclo.anio,
      periodos: ps.map((p) => ({ id: p.id, nombre: p.nombre, abierto: p.abierto })),
      cursos: cursosBoleta, datosPeriodo,
      promedioGeneral: promedio(cursosBoleta.map((c) => c.promedio)),
      resultado,
      totalInasistencias: datosPeriodo.reduce((s, d) => s + d.inasistencias, 0),
      saldoVencido: cuenta.vencido, cuotasVencidas: cuenta.cuotasVencidas,
    };
  });

  // mismo orden en que se pidieron
  boletas.sort((a, b) => inscripcionIds.indexOf(a.inscripcionId) - inscripcionIds.indexOf(b.inscripcionId));
  return { boletas, ajustes };
}

export const estaRetenida = (b: Boleta, a: Ajustes) => a.bloquearBoletaMora && b.saldoVencido > 0;

export { fmtNota };
