"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function leerTexto(fd: FormData, nombre: string) {
  return String(fd.get(nombre) ?? "").trim();
}

function validarNombre(nombre: string) {
  if (!nombre) throw new ErrorNegocio("El nombre es obligatorio.");
}

function validarEmail(email: string) {
  if (!emailRegex.test(email)) throw new ErrorNegocio("El correo no es válido.");
}

function validarPassword(password: string, confirmar: string) {
  if (password.length < 8) throw new ErrorNegocio("La contraseña debe tener al menos 8 caracteres.");
  if (password !== confirmar) throw new ErrorNegocio("Las contraseñas no coinciden.");
}

export async function crearAdmin(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const nombre = leerTexto(fd, "nombre");
  const email = leerTexto(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");

  try {
    validarNombre(nombre);
    validarEmail(email);
    validarPassword(password, confirmar);

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) throw new ErrorNegocio("Ya existe un administrador con ese correo.");

    const id = await prisma.$transaction(async (tx) => {
      const creado = await tx.usuario.create({
        data: {
          nombre,
          email,
          passwordHash: await bcrypt.hash(password, 10),
          rol: "ADMIN",
          activo: true,
        },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId,
        accion: "ADMIN_CREADO",
        entidad: "Usuario",
        entidadId: creado.id,
        detalle: `${nombre} (${email})`,
      });
      return creado.id;
    });

    revalidatePath("/admin/usuarios");
    redirect(`/admin/usuarios/${id}`);
  } catch (e) {
    return aEstadoError(e);
  }
}

export async function actualizarAdmin(id: number, _prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const nombre = leerTexto(fd, "nombre");
  const email = leerTexto(fd, "email").toLowerCase();

  try {
    validarNombre(nombre);
    validarEmail(email);

    await prisma.$transaction(async (tx) => {
      const current = await tx.usuario.findUnique({ where: { id } });
      if (!current || current.rol !== "ADMIN") throw new ErrorNegocio("Administrador no encontrado.");
      const dup = await tx.usuario.findUnique({ where: { email } });
      if (dup && dup.id !== id) throw new ErrorNegocio("Ya existe otro administrador con ese correo.");

      await tx.usuario.update({
        where: { id },
        data: { nombre, email },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId,
        accion: "ADMIN_EDITADO",
        entidad: "Usuario",
        entidadId: id,
        detalle: `${nombre} (${email})`,
      });
    });

    revalidatePath("/admin/usuarios");
    return { ok: "Administrador actualizado." };
  } catch (e) {
    return aEstadoError(e);
  }
}

export async function alternarEstadoAdmin(id: number) {
  const sesion = await requireAdmin();
  const admin = await prisma.usuario.findUnique({ where: { id } });
  if (!admin || admin.rol !== "ADMIN") return;
  if (admin.id === sesion.userId) return;

  const activos = await prisma.usuario.count({ where: { rol: "ADMIN", activo: true } });
  if (admin.activo && activos <= 1) return;

  const siguiente = !admin.activo;
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: { activo: siguiente } });
    await registrarBitacora(tx, {
      usuarioId: sesion.userId,
      accion: siguiente ? "ADMIN_REACTIVADO" : "ADMIN_DESACTIVADO",
      entidad: "Usuario",
      entidadId: id,
      detalle: admin.email,
    });
  });

  revalidatePath("/admin/usuarios");
}

export async function cambiarPasswordAdmin(id: number, _prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const password = String(fd.get("password") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");

  try {
    validarPassword(password, confirmar);

    const admin = await prisma.usuario.findUnique({ where: { id } });
    if (!admin || admin.rol !== "ADMIN") throw new ErrorNegocio("Administrador no encontrado.");

    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id },
        data: { passwordHash: await bcrypt.hash(password, 10) },
      });
      await registrarBitacora(tx, {
        usuarioId: sesion.userId,
        accion: "ADMIN_PASSWORD",
        entidad: "Usuario",
        entidadId: id,
        detalle: admin.email,
      });
    });

    return { ok: "Contraseña actualizada." };
  } catch (e) {
    return aEstadoError(e);
  }
}
