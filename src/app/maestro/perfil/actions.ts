"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { cerrarSesion } from "@/lib/session";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";

export async function cambiarPasswordMaestroAction(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const actor = await requireActor();
  if (actor.rol !== "MAESTRO" || !actor.maestroId) {
    return { error: "Acceso no autorizado." };
  }

  const passwordActual = String(formData.get("passwordActual") ?? "").trim();
  const passwordNueva = String(formData.get("passwordNueva") ?? "").trim();
  const passwordConfirmacion = String(formData.get("passwordConfirmacion") ?? "").trim();

  try {
    if (!passwordActual || !passwordNueva || !passwordConfirmacion) {
      throw new ErrorNegocio("Por favor completa todos los campos.");
    }

    // 1. Obtener usuario para verificar su hash actual
    const usuario = await prisma.usuario.findUnique({
      where: { id: actor.usuarioId },
    });

    if (!usuario) {
      throw new ErrorNegocio("Usuario no encontrado.");
    }

    // Paso 1 de verificación: Que la contraseña actual sea correcta con bcrypt.compare
    const actualEsValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!actualEsValida) {
      throw new ErrorNegocio("La contraseña actual es incorrecta.");
    }

    // Paso 2 de verificación: Que la nueva tenga al menos 8 caracteres
    if (passwordNueva.length < 8) {
      throw new ErrorNegocio("La nueva contraseña debe tener al menos 8 caracteres.");
    }

    // Paso 3 de verificación: Que la nueva y su confirmación coincidan
    if (passwordNueva !== passwordConfirmacion) {
      throw new ErrorNegocio("La confirmación no coincide con la nueva contraseña.");
    }

    // Paso 4 de verificación: Que la nueva sea distinta de la actual
    if (passwordActual === passwordNueva) {
      throw new ErrorNegocio("La nueva contraseña debe ser diferente a la contraseña actual.");
    }

    // Guardar con bcrypt.hash(nueva, 10), igual que en prisma/seed.ts
    const passwordHash = await bcrypt.hash(passwordNueva, 10);

    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: actor.usuarioId },
        data: { passwordHash },
      });

      // Registrar en bitácora sin guardar la contraseña en ningún registro
      await registrarBitacora(tx, {
        usuarioId: actor.usuarioId,
        accion: "CAMBIO_PASSWORD",
        entidad: "Usuario",
        entidadId: actor.usuarioId,
        detalle: "El maestro actualizó su contraseña personal de acceso",
      });
    });

    // Cerrar sesión para que ingrese de nuevo con su nueva clave
    await cerrarSesion();
  } catch (error) {
    return aEstadoError(error);
  }

  redirect("/login?cambioPassword=1");
}
