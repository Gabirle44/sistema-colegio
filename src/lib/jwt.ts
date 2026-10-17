import { SignJWT, jwtVerify } from "jose";

export type Rol = "ADMIN" | "MAESTRO";
export type Sesion = { userId: number; rol: Rol };

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("Falta SESSION_SECRET en el archivo .env");
const key = new TextEncoder().encode(secret);

export async function firmarSesion(sesion: Sesion): Promise<string> {
  return new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key);
}

export async function leerSesion(token?: string): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return { userId: payload.userId as number, rol: payload.rol as Rol };
  } catch {
    return null;
  }
}
