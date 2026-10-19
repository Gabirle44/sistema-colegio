"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearSesion, cerrarSesion } from "@/lib/session";
import { BLOQUEO_MINUTOS, bloqueoActivo, direccionIp, limpiarTrasExito, registrarFallo } from "@/lib/login/intentos";

export type LoginState = { error?: string } | undefined;

// Hash de descarte: se compara aunque el correo no exista, para que un atacante
// no pueda adivinar qué correos están registrados midiendo el tiempo de respuesta.
const HASH_FALSO = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8DqvO1Yl7hQcGQ0xJHPjRQ/0GYH3Hq";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña" };
  }

  const ip = await direccionIp();

  const bloqueo = await bloqueoActivo(email, ip);
  if (bloqueo) {
    return {
      error: `Demasiados intentos fallidos. Espera ${bloqueo.minutos} minuto(s) antes de volver a intentar.`,
    };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const coincide = await bcrypt.compare(password, usuario?.passwordHash ?? HASH_FALSO);

  if (!usuario || !usuario.activo || !coincide) {
    const { bloqueado, restantes } = await registrarFallo(email, ip);
    if (bloqueado) {
      return { error: `Demasiados intentos fallidos. Espera ${BLOQUEO_MINUTOS} minutos antes de volver a intentar.` };
    }
    return {
      error:
        restantes <= 2
          ? `Correo o contraseña incorrectos. Te quedan ${restantes} intento(s).`
          : "Correo o contraseña incorrectos",
    };
  }

  await limpiarTrasExito(email, ip);
  await crearSesion({ userId: usuario.id, rol: usuario.rol });
  redirect(usuario.rol === "ADMIN" ? "/admin" : "/maestro");
}

export async function logout() {
  await cerrarSesion();
  redirect("/login");
}
