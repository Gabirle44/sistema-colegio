/**
 * Respaldo de la base de datos (SC-30).
 *
 * Uso:   npm run respaldo
 * Lee DATABASE_URL de .env (o de la variable de entorno) y guarda TODAS las
 * tablas en backups/respaldo-AAAA-MM-DD_HHMM.json. La carpeta backups/ no se
 * sube a GitHub porque contiene datos reales de alumnos.
 *
 * No necesita pg_dump: usa Prisma, así funciona igual en Windows, Mac y Linux.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const reemplazo = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

async function main() {
  const modelos = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const datos: Record<string, unknown[]> = {};
  const conteo: Record<string, number> = {};

  for (const nombre of modelos) {
    const delegado = (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[
      nombre.charAt(0).toLowerCase() + nombre.slice(1)
    ];
    const filas = await delegado.findMany();
    datos[nombre] = filas;
    conteo[nombre] = filas.length;
  }

  const ahora = new Date(Date.now() - 6 * 3_600_000); // hora de Guatemala
  const marca = ahora.toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  mkdirSync("backups", { recursive: true });
  const archivo = `backups/respaldo-${marca}.json`;
  writeFileSync(
    archivo,
    JSON.stringify({ generado: ahora.toISOString(), tablas: conteo, datos }, reemplazo, 2),
  );

  const total = Object.values(conteo).reduce((a, b) => a + b, 0);
  console.log(`Respaldo listo: ${archivo}`);
  console.log(`${modelos.length} tablas, ${total} registros.`);
  console.table(conteo);
}

main()
  .catch((e) => {
    console.error("No se pudo respaldar:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
