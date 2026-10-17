import { prisma } from "@/lib/prisma";

// Devuelve la configuración del colegio; si todavía no existe, la crea con valores por defecto.
export function obtenerConfig() {
  return prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
