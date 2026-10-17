"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearSesion, cerrarSesion } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña" };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const valido =
    usuario && usuario.activo && (await bcrypt.compare(password, usuario.passwordHash));

  if (!usuario || !valido) {
    return { error: "Correo o contraseña incorrectos" };
  }

  await crearSesion({ userId: usuario.id, rol: usuario.rol });
  redirect(usuario.rol === "ADMIN" ? "/admin" : "/maestro");
}

export async function logout() {
  await cerrarSesion();
  redirect("/login");
}
