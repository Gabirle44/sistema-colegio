"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { requireActor } from "./acceso";
import { CONDUCTAS } from "./calculo";

function parseNota(v: FormDataEntryValue | null, max: number, etiqueta: string): number | null {
  const t = String(v ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new ErrorNegocio(`${etiqueta}: debe ser un número entre 0 y ${max}.`);
  return Math.round(n * 100) / 100;
}

// Guarda las notas de un curso/sección/periodo (maestro dueño del curso, o administrador)
export async function guardarNotas(
  asignacionId: number,
  periodoId: number,
  _prev: AccionState,
  fd: FormData,
): Promise<AccionState> {
  const actor = await requireActor();
  try {
    const guardadas = await prisma.$transaction(async (tx) => {
      const asig = await tx.asignacionCurso.findUnique({
        where: { id: asignacionId },
        include: { curso: true, seccion: { include: { grado: true } } },
      });
      if (!asig) throw new ErrorNegocio("La asignación no existe.");
      if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) {
        throw new ErrorNegocio("Ese curso no está asignado a ti.");
      }
      const periodo = await tx.periodo.findUnique({ where: { id: periodoId } });
      if (!periodo || periodo.cicloId !== asig.seccion.cicloId) throw new ErrorNegocio("Periodo no válido.");
      if (!periodo.abierto && actor.rol !== "ADMIN") {
        throw new ErrorNegocio("Este periodo está cerrado. Pide al administrador que lo reabra.");
      }
      const cfg = await tx.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
      const zonaMax = cfg.zonaMax;
      const examenMax = 100 - cfg.zonaMax;

      const inscripciones = await tx.inscripcion.findMany({
        where: { seccionId: asig.seccionId, cicloId: asig.seccion.cicloId },
        include: { alumno: true },
      });

      let n = 0;
      let borradas = 0;
      for (const ins of inscripciones) {
        const nombre = `${ins.alumno.apellidos}, ${ins.alumno.nombres}`;
        if (!fd.has(`zona_${ins.id}`) && !fd.has(`examen_${ins.id}`)) continue;
        const zona = parseNota(fd.get(`zona_${ins.id}`), zonaMax, `${nombre} (zona)`);
        const examen = parseNota(fd.get(`examen_${ins.id}`), examenMax, `${nombre} (examen)`);
        const obs = String(fd.get(`obs_${ins.id}`) ?? "").trim() || null;
        const clave = { inscripcionId_cursoId_periodoId: { inscripcionId: ins.id, cursoId: asig.cursoId, periodoId } };

        if (zona === null && examen === null) {
          const r = await tx.nota.deleteMany({ where: { inscripcionId: ins.id, cursoId: asig.cursoId, periodoId } });
          borradas += r.count;
          continue;
        }
        const valor = Math.round(((zona ?? 0) + (examen ?? 0)) * 100) / 100;
        const datos = {
          zona: zona === null ? null : zona.toFixed(2),
          examen: examen === null ? null : examen.toFixed(2),
          valor: valor.toFixed(2),
          observacion: obs,
        };
        await tx.nota.upsert({
          where: clave,
          update: { ...datos, ...(actor.maestroId ? { registradaPorId: actor.maestroId } : {}) },
          create: {
            inscripcionId: ins.id, cursoId: asig.cursoId, periodoId, ...datos,
            registradaPorId: actor.maestroId,
          },
        });
        n++;
      }
      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId, accion: "NOTAS", entidad: "Nota", entidadId: asignacionId,
        detalle: `${asig.curso.nombre} · ${asig.seccion.grado.nombre} ${asig.seccion.nombre} · ${periodo.nombre}: ${n} nota(s) guardadas${borradas ? `, ${borradas} borradas` : ""}`,
      });
      return n;
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/maestro", "layout");
    return { ok: `Notas guardadas (${guardadas} alumno(s)).` };
  } catch (e) {
    return aEstadoError(e);
  }
}

export async function crearPeriodo(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (nombre.length < 2) return { error: "Escribe el nombre del periodo (ej. Bimestre I)." };
  try {
    await prisma.$transaction(async (tx) => {
      const ciclo = await tx.cicloEscolar.findFirst({ where: { activo: true } });
      if (!ciclo) throw new ErrorNegocio("No hay un ciclo escolar activo.");
      const ultimo = await tx.periodo.findFirst({ where: { cicloId: ciclo.id }, orderBy: { numero: "desc" } });
      const p = await tx.periodo.create({ data: { cicloId: ciclo.id, numero: (ultimo?.numero ?? 0) + 1, nombre } });
      await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "PERIODO", entidad: "Periodo", entidadId: p.id, detalle: `Creado: ${nombre}` });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath("/admin/notas");
  return { ok: "Periodo creado." };
}

export async function periodosEstandar() {
  const sesion = await requireAdmin();
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  if (!ciclo) return;
  const existentes = await prisma.periodo.count({ where: { cicloId: ciclo.id } });
  if (existentes > 0) return;
  await prisma.periodo.createMany({
    data: ["Bimestre I", "Bimestre II", "Bimestre III", "Bimestre IV"].map((nombre, i) => ({ cicloId: ciclo.id, numero: i + 1, nombre })),
  });
  await registrarBitacora(prisma, { usuarioId: sesion.userId, accion: "PERIODO", entidad: "Periodo", detalle: "Creados 4 bimestres" });
  revalidatePath("/admin/notas");
}

export async function alternarPeriodo(periodoId: number) {
  const sesion = await requireAdmin();
  const p = await prisma.periodo.findUnique({ where: { id: periodoId } });
  if (!p) return;
  await prisma.periodo.update({ where: { id: periodoId }, data: { abierto: !p.abierto } });
  await registrarBitacora(prisma, {
    usuarioId: sesion.userId, accion: p.abierto ? "PERIODO_CERRADO" : "PERIODO_ABIERTO", entidad: "Periodo", entidadId: periodoId, detalle: p.nombre,
  });
  revalidatePath("/admin/notas");
}

// Inasistencias, conducta y comentario de la boleta de un alumno en un periodo
export async function guardarBoletaPeriodo(
  inscripcionId: number,
  periodoId: number,
  _prev: AccionState,
  fd: FormData,
): Promise<AccionState> {
  const sesion = await requireAdmin();
  const inas = Number(String(fd.get("inasistencias") ?? "0").trim() || "0");
  const conducta = String(fd.get("conducta") ?? "");
  const comentario = String(fd.get("comentario") ?? "").trim();
  if (!Number.isInteger(inas) || inas < 0 || inas > 365) return { error: "Las inasistencias deben ser un número entero (0 o más)." };
  if (conducta && !(CONDUCTAS as readonly string[]).includes(conducta)) return { error: "Conducta no válida." };
  if (comentario.length > 300) return { error: "El comentario es muy largo (máximo 300 letras)." };
  try {
    await prisma.boletaPeriodo.upsert({
      where: { inscripcionId_periodoId: { inscripcionId, periodoId } },
      update: { inasistencias: inas, conducta: conducta || null, comentario: comentario || null },
      create: { inscripcionId, periodoId, inasistencias: inas, conducta: conducta || null, comentario: comentario || null },
    });
    await registrarBitacora(prisma, {
      usuarioId: sesion.userId, accion: "BOLETA_DATOS", entidad: "BoletaPeriodo", entidadId: inscripcionId, detalle: `Periodo ${periodoId}`,
    });
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath(`/admin/boletas/${inscripcionId}`);
  return { ok: "Guardado." };
}
