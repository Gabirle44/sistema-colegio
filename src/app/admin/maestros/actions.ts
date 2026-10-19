"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { deCentavos, parseCentavos } from "@/lib/cobros/utils";

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^[0-9+\-\s]{8,15}$/;
const refrescar = () => revalidatePath("/admin", "layout");

type Datos = { nombres: string; apellidos: string; email: string; telefono: string | null; salario: number };

function leerDatos(fd: FormData): Datos {
  const nombres = txt(fd, "nombres");
  const apellidos = txt(fd, "apellidos");
  const email = txt(fd, "email").toLowerCase();
  const telefono = txt(fd, "telefono");
  const salario = parseCentavos(fd.get("salario"), { vacioEsCero: true });
  if (!nombres) throw new ErrorNegocio("Los nombres son obligatorios.");
  if (!apellidos) throw new ErrorNegocio("Los apellidos son obligatorios.");
  if (!CORREO.test(email)) throw new ErrorNegocio("Escribe un correo válido (con él inicia sesión).");
  if (telefono && !TELEFONO.test(telefono)) throw new ErrorNegocio("El teléfono no es válido.");
  if (salario === null) throw new ErrorNegocio("El salario no es válido.");
  return { nombres, apellidos, email, telefono: telefono || null, salario };
}

function validarPassword(p: string, confirmar: string) {
  if (p.length < 8) throw new ErrorNegocio("La contraseña debe tener al menos 8 caracteres.");
  if (p !== confirmar) throw new ErrorNegocio("Las contraseñas no coinciden.");
}

export async function crearMaestro(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  let id = 0;
  try {
    const d = leerDatos(fd);
    validarPassword(String(fd.get("password") ?? ""), String(fd.get("confirmar") ?? ""));
    const hash = await bcrypt.hash(String(fd.get("password")), 10);
    id = await prisma.$transaction(async (tx) => {
      if (await tx.usuario.findUnique({ where: { email: d.email } })) {
        throw new ErrorNegocio("Ya existe un usuario con ese correo.");
      }
      const u = await tx.usuario.create({
        data: { nombre: `${d.nombres} ${d.apellidos}`, email: d.email, passwordHash: hash, rol: "MAESTRO" },
      });
      const m = await tx.maestro.create({
        data: {
          usuarioId: u.id, nombres: d.nombres, apellidos: d.apellidos, telefono: d.telefono,
          salarioMensual: deCentavos(d.salario),
        },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "MAESTRO_CREADO", entidad: "Maestro", entidadId: m.id,
        detalle: `${d.nombres} ${d.apellidos} (${d.email})`,
      });
      return m.id;
    });
  } catch (e) {
    return aEstadoError(e);
  }
  refrescar();
  redirect(`/admin/maestros/${id}`);
}

export async function actualizarMaestro(id: number, _prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  try {
    const d = leerDatos(fd);
    await prisma.$transaction(async (tx) => {
      const m = await tx.maestro.findUnique({ where: { id } });
      if (!m) throw new ErrorNegocio("Maestro no encontrado.");
      if (m.usuarioId) {
        const otro = await tx.usuario.findUnique({ where: { email: d.email } });
        if (otro && otro.id !== m.usuarioId) throw new ErrorNegocio("Ya existe un usuario con ese correo.");
        await tx.usuario.update({
          where: { id: m.usuarioId }, data: { nombre: `${d.nombres} ${d.apellidos}`, email: d.email },
        });
      }
      await tx.maestro.update({
        where: { id },
        data: { nombres: d.nombres, apellidos: d.apellidos, telefono: d.telefono, salarioMensual: deCentavos(d.salario) },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "MAESTRO_EDITADO", entidad: "Maestro", entidadId: id,
        detalle: `${d.nombres} ${d.apellidos} · salario Q${deCentavos(d.salario)}`,
      });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  refrescar();
  return { ok: "Datos guardados." };
}

// Activa o desactiva al maestro y su acceso al sistema.
export async function alternarEstado(id: number) {
  const sesion = await requireAdmin();
  const m = await prisma.maestro.findUnique({ where: { id } });
  if (!m) return;
  const activo = !m.activo;
  await prisma.$transaction(async (tx) => {
    await tx.maestro.update({ where: { id }, data: { activo } });
    if (m.usuarioId) await tx.usuario.update({ where: { id: m.usuarioId }, data: { activo } });
    await registrarBitacora(tx, {
      usuarioId: sesion.userId, accion: activo ? "MAESTRO_ACTIVADO" : "MAESTRO_DESACTIVADO", entidad: "Maestro",
      entidadId: id, detalle: `${m.nombres} ${m.apellidos}`,
    });
  });
  refrescar();
}

export async function cambiarPassword(id: number, _prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  try {
    validarPassword(String(fd.get("password") ?? ""), String(fd.get("confirmar") ?? ""));
    const m = await prisma.maestro.findUnique({ where: { id } });
    if (!m?.usuarioId) throw new ErrorNegocio("Este maestro no tiene usuario.");
    const hash = await bcrypt.hash(String(fd.get("password")), 10);
    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({ where: { id: m.usuarioId! }, data: { passwordHash: hash } });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "PASSWORD_RESTABLECIDA", entidad: "Maestro", entidadId: id,
        detalle: `${m.nombres} ${m.apellidos}`,
      });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  return { ok: "Contraseña actualizada." };
}
