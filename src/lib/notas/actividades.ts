"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { requireActor, type Actor } from "./acceso";
import { num } from "./calculo";

const r2 = (n: number) => Math.round(n * 100) / 100;

function parsePuntos(v: FormDataEntryValue | string | null | undefined, max: number, etiqueta: string): number | null {
  const t = String(v ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new ErrorNegocio(`${etiqueta}: debe ser un número entre 0 y ${max}.`);
  return r2(n);
}

// Verifica que el actor pueda tocar este curso/periodo y devuelve lo necesario
async function contexto(tx: Prisma.TransactionClient, actor: Actor, asignacionId: number, periodoId: number) {
  const asig = await tx.asignacionCurso.findUnique({
    where: { id: asignacionId },
    include: { curso: true, seccion: { include: { grado: true } } },
  });
  if (!asig) throw new ErrorNegocio("La asignación no existe.");
  if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) throw new ErrorNegocio("Ese curso no está asignado a ti.");
  const periodo = await tx.periodo.findUnique({ where: { id: periodoId } });
  if (!periodo || periodo.cicloId !== asig.seccion.cicloId) throw new ErrorNegocio("Periodo no válido.");
  if (!periodo.abierto && actor.rol !== "ADMIN") throw new ErrorNegocio("Este periodo está cerrado. Pide al administrador que lo reabra.");
  const cfg = await tx.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return { asig, periodo, zonaMax: cfg.zonaMax, examenMax: 100 - cfg.zonaMax };
}

// Zona = suma de puntos de actividades. Solo se recalculan alumnos que tienen puntos en actividades.
async function recalcular(
  tx: Prisma.TransactionClient, asig: { id: number; cursoId: number }, periodoId: number, inscripcionIds: number[],
) {
  if (inscripcionIds.length === 0) return;
  const puntos = await tx.notaActividad.findMany({
    where: { inscripcionId: { in: inscripcionIds }, actividad: { asignacionId: asig.id, periodoId } },
  });
  const suma = new Map<number, number>();
  for (const p of puntos) suma.set(p.inscripcionId, r2((suma.get(p.inscripcionId) ?? 0) + num(p.puntos)));
  const existentes = await tx.nota.findMany({
    where: { inscripcionId: { in: inscripcionIds }, cursoId: asig.cursoId, periodoId },
  });
  for (const id of inscripcionIds) {
    const prev = existentes.find((n) => n.inscripcionId === id);
    const zona = suma.has(id) ? suma.get(id)! : null;
    const examen = prev?.examen != null ? num(prev.examen) : null;
    const clave = { inscripcionId_cursoId_periodoId: { inscripcionId: id, cursoId: asig.cursoId, periodoId } };
    if (zona === null && examen === null) {
      if (prev) await tx.nota.delete({ where: clave });
      continue;
    }
    const valor = r2((zona ?? 0) + (examen ?? 0));
    const datos = { zona: zona === null ? null : zona.toFixed(2), examen: examen === null ? null : examen.toFixed(2), valor: valor.toFixed(2) };
    await tx.nota.upsert({
      where: clave, update: datos,
      create: { inscripcionId: id, cursoId: asig.cursoId, periodoId, ...datos },
    });
  }
}

type FilaDef = { id?: number; nombre: string; puntos: number };

// Define (crea, edita, elimina) las actividades de un curso en un periodo
export async function guardarActividades(
  asignacionId: number, periodoId: number, _prev: AccionState, fd: FormData,
): Promise<AccionState> {
  const actor = await requireActor();
  try {
    let crudo: unknown;
    try { crudo = JSON.parse(String(fd.get("json") ?? "[]")); } catch { throw new ErrorNegocio("Datos no válidos."); }
    if (!Array.isArray(crudo)) throw new ErrorNegocio("Datos no válidos.");
    const copiar = fd.get("copiar") === "on";

    const resumen = await prisma.$transaction(async (tx) => {
      const { asig, periodo, zonaMax } = await contexto(tx, actor, asignacionId, periodoId);

      const filas: FilaDef[] = crudo.map((r: { id?: unknown; nombre?: unknown; puntos?: unknown }, i: number) => {
        const nombre = String(r.nombre ?? "").trim();
        const puntos = Number(String(r.puntos ?? "").replace(",", "."));
        if (!nombre) throw new ErrorNegocio(`Escribe el nombre de la actividad #${i + 1}.`);
        if (nombre.length > 60) throw new ErrorNegocio(`"${nombre.slice(0, 20)}…": el nombre es muy largo (máximo 60).`);
        if (!Number.isFinite(puntos) || puntos <= 0 || puntos > zonaMax) {
          throw new ErrorNegocio(`"${nombre}": los puntos deben estar entre 0.01 y ${zonaMax}.`);
        }
        const id = Number.isInteger(r.id) ? Number(r.id) : undefined;
        return { id, nombre, puntos: r2(puntos) };
      });
      const total = r2(filas.reduce((s, f) => s + f.puntos, 0));
      if (total > zonaMax) throw new ErrorNegocio(`Las actividades suman ${total} y la zona vale ${zonaMax}. Quita ${r2(total - zonaMax)} punto(s).`);

      const actuales = await tx.actividad.findMany({ where: { asignacionId, periodoId }, include: { notas: true } });
      const idsActuales = new Set(actuales.map((a) => a.id));
      for (const f of filas) if (f.id !== undefined && !idsActuales.has(f.id)) throw new ErrorNegocio("Una actividad ya no existe. Recarga la página.");

      // No bajar los puntos de una actividad por debajo de lo que ya sacó algún alumno
      for (const f of filas) {
        const a = actuales.find((x) => x.id === f.id);
        const max = a ? Math.max(0, ...a.notas.map((n) => num(n.puntos))) : 0;
        if (a && max > f.puntos) throw new ErrorNegocio(`"${f.nombre}": un alumno ya tiene ${max} punto(s); no puedes bajarla a ${f.puntos}.`);
      }

      const quedan = new Set(filas.filter((f) => f.id !== undefined).map((f) => f.id!));
      const aEliminar = actuales.filter((a) => !quedan.has(a.id));
      const afectados = new Set<number>();
      for (const a of aEliminar) for (const n of a.notas) afectados.add(n.inscripcionId);
      if (aEliminar.length) await tx.actividad.deleteMany({ where: { id: { in: aEliminar.map((a) => a.id) } } });

      for (const [orden, f] of filas.entries()) {
        if (f.id !== undefined) {
          await tx.actividad.update({ where: { id: f.id }, data: { nombre: f.nombre, puntos: f.puntos.toFixed(2), orden } });
        } else {
          await tx.actividad.create({ data: { asignacionId, periodoId, nombre: f.nombre, puntos: f.puntos.toFixed(2), orden } });
        }
      }
      // Si se quitaron actividades, las notas de los alumnos afectados se recalculan
      if (aEliminar.length && filas.length > 0) await recalcular(tx, asig, periodoId, [...afectados]);

      let copiadas = 0;
      if (copiar && filas.length > 0) {
        const otros = await tx.periodo.findMany({ where: { cicloId: periodo.cicloId, NOT: { id: periodoId } } });
        for (const o of otros) {
          if ((await tx.actividad.count({ where: { asignacionId, periodoId: o.id } })) > 0) continue;
          await tx.actividad.createMany({
            data: filas.map((f, orden) => ({ asignacionId, periodoId: o.id, nombre: f.nombre, puntos: f.puntos.toFixed(2), orden })),
          });
          copiadas++;
        }
      }
      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId, accion: "ACTIVIDADES", entidad: "Actividad", entidadId: asignacionId,
        detalle: `${asig.curso.nombre} · ${asig.seccion.grado.nombre} ${asig.seccion.nombre} · ${periodo.nombre}: ${filas.length} actividad(es), ${total} pts${copiadas ? ` (copiadas a ${copiadas} periodo(s))` : ""}`,
      });
      return { total, n: filas.length, copiadas, zonaMax };
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/maestro", "layout");
    if (resumen.n === 0) return { ok: "Actividades quitadas. Vuelves a capturar la zona completa." };
    const falta = r2(resumen.zonaMax - resumen.total);
    return {
      ok: `Guardado: ${resumen.n} actividad(es), ${resumen.total} pts.` +
        (falta > 0 ? ` Ojo: faltan ${falta} pts para completar la zona (${resumen.zonaMax}).` : "") +
        (resumen.copiadas ? ` Copiadas a ${resumen.copiadas} periodo(s) más.` : ""),
    };
  } catch (e) {
    return aEstadoError(e);
  }
}

// Guarda los puntos por actividad y el examen de todos los alumnos del curso
export async function guardarNotasActividades(
  asignacionId: number, periodoId: number, _prev: AccionState, fd: FormData,
): Promise<AccionState> {
  const actor = await requireActor();
  try {
    const n = await prisma.$transaction(async (tx) => {
      const { asig, periodo, examenMax } = await contexto(tx, actor, asignacionId, periodoId);
      const actividades = await tx.actividad.findMany({ where: { asignacionId, periodoId }, orderBy: [{ orden: "asc" }, { id: "asc" }] });
      if (actividades.length === 0) throw new ErrorNegocio("Este periodo no tiene actividades definidas.");
      const inscripciones = await tx.inscripcion.findMany({
        where: { seccionId: asig.seccionId, cicloId: asig.seccion.cicloId }, include: { alumno: true },
      });

      let guardados = 0;
      for (const ins of inscripciones) {
        if (!fd.has(`examen_${ins.id}`) && !actividades.some((a) => fd.has(`act_${a.id}_${ins.id}`))) continue;
        const nombre = `${ins.alumno.apellidos}, ${ins.alumno.nombres}`;
        let hayZona = false;
        let zona = 0;
        for (const a of actividades) {
          const p = parsePuntos(fd.get(`act_${a.id}_${ins.id}`), num(a.puntos), `${nombre} · ${a.nombre}`);
          const clave = { actividadId_inscripcionId: { actividadId: a.id, inscripcionId: ins.id } };
          if (p === null) {
            await tx.notaActividad.deleteMany({ where: { actividadId: a.id, inscripcionId: ins.id } });
          } else {
            hayZona = true;
            zona += p;
            await tx.notaActividad.upsert({
              where: clave, update: { puntos: p.toFixed(2) }, create: { actividadId: a.id, inscripcionId: ins.id, puntos: p.toFixed(2) },
            });
          }
        }
        const examen = parsePuntos(fd.get(`examen_${ins.id}`), examenMax, `${nombre} (examen)`);
        const obs = String(fd.get(`obs_${ins.id}`) ?? "").trim() || null;
        const clave = { inscripcionId_cursoId_periodoId: { inscripcionId: ins.id, cursoId: asig.cursoId, periodoId } };
        if (!hayZona && examen === null) {
          await tx.nota.deleteMany({ where: { inscripcionId: ins.id, cursoId: asig.cursoId, periodoId } });
          continue;
        }
        const z = hayZona ? r2(zona) : null;
        const datos = {
          zona: z === null ? null : z.toFixed(2), examen: examen === null ? null : examen.toFixed(2),
          valor: r2((z ?? 0) + (examen ?? 0)).toFixed(2), observacion: obs,
        };
        await tx.nota.upsert({
          where: clave,
          update: { ...datos, ...(actor.maestroId ? { registradaPorId: actor.maestroId } : {}) },
          create: { inscripcionId: ins.id, cursoId: asig.cursoId, periodoId, ...datos, registradaPorId: actor.maestroId },
        });
        guardados++;
      }
      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId, accion: "NOTAS", entidad: "Nota", entidadId: asignacionId,
        detalle: `${asig.curso.nombre} · ${asig.seccion.grado.nombre} ${asig.seccion.nombre} · ${periodo.nombre}: ${guardados} alumno(s) con actividades`,
      });
      return guardados;
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/maestro", "layout");
    return { ok: `Notas guardadas (${n} alumno(s)).` };
  } catch (e) {
    return aEstadoError(e);
  }
}
