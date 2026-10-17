import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

export type Actor =
  | { rol: "ADMIN"; usuarioId: number; maestroId: null }
  | { rol: "MAESTRO"; usuarioId: number; maestroId: number };

// Devuelve quién está logueado (admin o maestro con su registro de maestro); si no, a /login.
export async function requireActor(): Promise<Actor> {
  const s = await obtenerSesion();
  if (!s) redirect("/login");
  if (s.rol === "ADMIN") return { rol: "ADMIN", usuarioId: s.userId, maestroId: null };
  const m = await prisma.maestro.findUnique({ where: { usuarioId: s.userId } });
  if (!m || !m.activo) redirect("/login");
  return { rol: "MAESTRO", usuarioId: s.userId, maestroId: m.id };
}

export async function periodoAbiertoDe(cicloId: number) {
  return prisma.periodo.findFirst({ where: { cicloId, abierto: true }, orderBy: { numero: "asc" } });
}
