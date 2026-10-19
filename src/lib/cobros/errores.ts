import { Prisma } from "@prisma/client";
import { ErrorNegocio, type AccionState } from "./tipos";

export function aEstadoError(e: unknown): AccionState {
  if (e instanceof ErrorNegocio) return { error: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2034") return { error: "Otra operación se cruzó con esta. Intenta de nuevo." };
    if (e.code === "P2002") return { error: "Ese registro ya existe." };
  }
  console.error(e);
  return { error: "Ocurrió un error inesperado. Intenta de nuevo." };
}
