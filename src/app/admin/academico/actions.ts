"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";

const refrescar = () => revalidatePath("/admin", "layout");

const entero = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) ? n : null;
};

// ───────── Ciclos ─────────
export async function crearCiclo(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const anio = entero(fd.get("anio"));
  if (anio === null || anio < 2000 || anio > 2100) return { error: "Escribe un año válido (ej. 2027)." };
  const copiar = fd.get("copiar") === "on";
  const copiarMaestros = fd.get("copiarMaestros") === "on";

  try {
    await prisma.$transaction(async (tx) => {
      const existe = await tx.cicloEscolar.findUnique({ where: { anio } });
      if (existe) throw new ErrorNegocio(`El ciclo ${anio} ya existe.`);
      const nuevo = await tx.cicloEscolar.create({ data: { anio, activo: false } });
      let detalle = `Ciclo ${anio} creado`;

      const base = await tx.cicloEscolar.findFirst({ where: { activo: true } });
      if (copiar && base) {
        const periodos = await tx.periodo.findMany({ where: { cicloId: base.id }, orderBy: { numero: "asc" } });
        if (periodos.length > 0) {
          await tx.periodo.createMany({
            data: periodos.map((p) => ({ cicloId: nuevo.id, numero: p.numero, nombre: p.nombre, abierto: true })),
          });
        }
        const secciones = await tx.seccion.findMany({ where: { cicloId: base.id } });
        const mapa = new Map<number, number>();
        for (const s of secciones) {
          const n = await tx.seccion.create({ data: { nombre: s.nombre, gradoId: s.gradoId, cicloId: nuevo.id } });
          mapa.set(s.id, n.id);
        }
        if (copiarMaestros) {
          const asigs = await tx.asignacionCurso.findMany({ where: { seccionId: { in: [...mapa.keys()] } } });
          for (const a of asigs) {
            await tx.asignacionCurso.create({
              data: { maestroId: a.maestroId, cursoId: a.cursoId, seccionId: mapa.get(a.seccionId)! },
            });
          }
        }
        detalle += ` (copiadas ${secciones.length} secciones y ${periodos.length} periodos${copiarMaestros ? ", con maestros" : ""})`;
      }
      await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "CICLO", entidad: "CicloEscolar", entidadId: nuevo.id, detalle });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  refrescar();
  return { ok: `Ciclo ${anio} creado. Actívalo cuando quieras empezar a trabajar con él.` };
}

export async function activarCiclo(cicloId: number) {
  const sesion = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const c = await tx.cicloEscolar.findUnique({ where: { id: cicloId } });
    if (!c) return;
    await tx.cicloEscolar.updateMany({ data: { activo: false } });
    await tx.cicloEscolar.update({ where: { id: cicloId }, data: { activo: true } });
    await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "CICLO_ACTIVADO", entidad: "CicloEscolar", entidadId: cicloId, detalle: `Ciclo ${c.anio} activo` });
  });
  refrescar();
}

// ───────── Grados ─────────
export async function crearGrado(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (nombre.length < 2) return { error: "Escribe el nombre del grado (ej. Segundo Básico)." };
  try {
    await prisma.$transaction(async (tx) => {
      const ordenForm = entero(fd.get("orden"));
      const ultimo = await tx.grado.findFirst({ orderBy: { orden: "desc" } });
      const orden = ordenForm !== null && String(fd.get("orden") ?? "").trim() !== "" ? ordenForm : (ultimo?.orden ?? 0) + 1;
      const g = await tx.grado.create({ data: { nombre, orden } });
      await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "GRADO", entidad: "Grado", entidadId: g.id, detalle: nombre });
    });
  } catch (e) {
    const r = aEstadoError(e);
    return r?.error === "Ese registro ya existe." ? { error: "Ya existe un grado con ese nombre." } : r;
  }
  refrescar();
  return { ok: "Grado creado." };
}

export async function eliminarGrado(gradoId: number) {
  const sesion = await requireAdmin();
  const g = await prisma.grado.findUnique({
    where: { id: gradoId },
    include: { _count: { select: { secciones: true, cursos: true } } },
  });
  if (!g || g._count.secciones > 0 || g._count.cursos > 0) return;
  await prisma.grado.delete({ where: { id: gradoId } });
  await registrarBitacora(prisma, { usuarioId: sesion.userId, accion: "GRADO_ELIMINADO", entidad: "Grado", entidadId: gradoId, detalle: g.nombre });
  refrescar();
}

// ───────── Secciones (siempre del ciclo activo) ─────────
export async function crearSeccion(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const gradoId = entero(fd.get("gradoId"));
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!gradoId) return { error: "Elige el grado." };
  if (nombre.length < 1 || nombre.length > 10) return { error: "Escribe el nombre de la sección (ej. A, B, Única)." };
  try {
    await prisma.$transaction(async (tx) => {
      const ciclo = await tx.cicloEscolar.findFirst({ where: { activo: true } });
      if (!ciclo) throw new ErrorNegocio("No hay un ciclo activo.");
      const s = await tx.seccion.create({ data: { nombre, gradoId, cicloId: ciclo.id } });
      await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "SECCION", entidad: "Seccion", entidadId: s.id, detalle: `${nombre} (ciclo ${ciclo.anio})` });
    });
  } catch (e) {
    const r = aEstadoError(e);
    return r?.error === "Ese registro ya existe." ? { error: "Esa sección ya existe en ese grado." } : r;
  }
  refrescar();
  return { ok: "Sección creada." };
}

export async function eliminarSeccion(seccionId: number) {
  const sesion = await requireAdmin();
  const s = await prisma.seccion.findUnique({
    where: { id: seccionId },
    include: { _count: { select: { inscripciones: true, asignaciones: true } } },
  });
  if (!s || s._count.inscripciones > 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.asignacionCurso.deleteMany({ where: { seccionId } });
    await tx.seccion.delete({ where: { id: seccionId } });
    await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "SECCION_ELIMINADA", entidad: "Seccion", entidadId: seccionId, detalle: s.nombre });
  });
  refrescar();
}

// ───────── Cursos ─────────
export async function crearCurso(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const gradoId = entero(fd.get("gradoId"));
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!gradoId) return { error: "Elige el grado." };
  if (nombre.length < 2) return { error: "Escribe el nombre del curso (ej. Matemática)." };
  try {
    await prisma.$transaction(async (tx) => {
      const c = await tx.curso.create({ data: { nombre, gradoId } });
      await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "CURSO", entidad: "Curso", entidadId: c.id, detalle: nombre });
    });
  } catch (e) {
    const r = aEstadoError(e);
    return r?.error === "Ese registro ya existe." ? { error: "Ese curso ya existe en ese grado." } : r;
  }
  refrescar();
  return { ok: "Curso creado." };
}

export async function eliminarCurso(cursoId: number) {
  const sesion = await requireAdmin();
  const c = await prisma.curso.findUnique({
    where: { id: cursoId },
    include: { _count: { select: { asignaciones: true, notas: true } } },
  });
  if (!c || c._count.asignaciones > 0 || c._count.notas > 0) return;
  await prisma.curso.delete({ where: { id: cursoId } });
  await registrarBitacora(prisma, { usuarioId: sesion.userId, accion: "CURSO_ELIMINADO", entidad: "Curso", entidadId: cursoId, detalle: c.nombre });
  refrescar();
}

// ───────── Asignación de maestros ─────────
export async function asignarMaestro(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const cursoId = entero(fd.get("cursoId"));
  const seccionId = entero(fd.get("seccionId"));
  const maestroId = entero(fd.get("maestroId"));
  if (!seccionId) return { error: "Elige la sección." };
  if (!cursoId) return { error: "Elige el curso." };
  if (!maestroId) return { error: "Elige el maestro." };
  try {
    await prisma.$transaction(async (tx) => {
      const [curso, seccion, maestro] = await Promise.all([
        tx.curso.findUnique({ where: { id: cursoId } }),
        tx.seccion.findUnique({ where: { id: seccionId }, include: { ciclo: true, grado: true } }),
        tx.maestro.findUnique({ where: { id: maestroId } }),
      ]);
      if (!curso || !seccion || !maestro) throw new ErrorNegocio("Datos no válidos.");
      if (curso.gradoId !== seccion.gradoId) throw new ErrorNegocio(`Ese curso no es de ${seccion.grado.nombre}.`);
      await tx.asignacionCurso.upsert({
        where: { cursoId_seccionId: { cursoId, seccionId } },
        update: { maestroId },
        create: { cursoId, seccionId, maestroId },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "ASIGNACION", entidad: "AsignacionCurso",
        detalle: `${curso.nombre} · ${seccion.grado.nombre} ${seccion.nombre} → ${maestro.nombres} ${maestro.apellidos}`,
      });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  refrescar();
  return { ok: "Maestro asignado." };
}

export async function quitarAsignacion(asignacionId: number) {
  const sesion = await requireAdmin();
  const a = await prisma.asignacionCurso.findUnique({ where: { id: asignacionId }, include: { curso: true, seccion: true } });
  if (!a) return;
  const notas = await prisma.nota.count({
    where: { cursoId: a.cursoId, inscripcion: { seccionId: a.seccionId } },
  });
  if (notas > 0) return;
  await prisma.asignacionCurso.delete({ where: { id: asignacionId } });
  await registrarBitacora(prisma, { usuarioId: sesion.userId, accion: "ASIGNACION_QUITADA", entidad: "AsignacionCurso", entidadId: asignacionId, detalle: a.curso.nombre });
  refrescar();
}
