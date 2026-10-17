import { cookies } from "next/headers";
import { firmarSesion, leerSesion, type Sesion } from "./jwt";

const COOKIE = "sesion";
const OCHO_HORAS = 60 * 60 * 8;

export async function crearSesion(sesion: Sesion) {
  const token = await firmarSesion(sesion);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OCHO_HORAS,
  });
}

export async function obtenerSesion(): Promise<Sesion | null> {
  return leerSesion((await cookies()).get(COOKIE)?.value);
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}
