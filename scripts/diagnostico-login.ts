/**
 * Dice por que no entra un usuario. Prueba la base DIRECTA y la del POOLER,
 * para descartar que la app y el script esten hablando con bases distintas.
 *
 * Uso:  npx tsx scripts/diagnostico-login.ts
 * Lee la cadena y las contraseñas de .env.produccion.txt
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";

const ARCHIVO = ".env.produccion.txt";

function leer(etiqueta: string): string | null {
  if (!existsSync(ARCHIVO)) return null;
  const lineas = readFileSync(ARCHIVO, "utf8").split(/\r?\n/);
  const i = lineas.findIndex((l) => l.trim().toUpperCase().startsWith(etiqueta));
  if (i < 0) return null;
  for (let j = i + 1; j < lineas.length; j++) {
    const v = lineas[j].trim();
    if (v && !v.startsWith("(")) return v;
  }
  return null;
}

// Lee la cadena de conexion de .env.neon, que contiene solo la URL y nada mas.
function urlDeArchivoNeon(): string | null {
  if (!existsSync(".env.neon")) return null;
  const v = readFileSync(".env.neon", "utf8").trim().split(/\r?\n/)[0]?.trim();
  return v && v.startsWith("postgresql://") ? v : null;
}

const url = urlDeArchivoNeon() ?? process.env.DATABASE_URL ?? leer("NEON_DATABASE_URL");
if (!url) { console.error(`No encontre NEON_DATABASE_URL en ${ARCHIVO}`); process.exit(1); }

const directa = url.replace("-pooler.", ".");
const pooler = directa.replace(/(@[^.]+)\./, "$1-pooler.");

const CUENTAS = [
  { etiqueta: "ADMIN", email: process.env.ADMIN_EMAIL ?? "admin@colegio.test", pass: leer("ADMIN_PASSWORD") },
  { etiqueta: "MAESTRO", email: process.env.MAESTRO_EMAIL ?? "maestro@colegio.test", pass: leer("MAESTRO_PASSWORD") },
];

async function revisar(nombre: string, cadena: string) {
  const host = cadena.match(/@([^/?]+)/)?.[1] ?? "?";
  console.log(`\n${"=".repeat(60)}\n${nombre}\n${host}\n${"=".repeat(60)}`);
  const db = new PrismaClient({ datasourceUrl: cadena });
  try {
    const total = await db.usuario.count();
    console.log(`Usuarios en esta base: ${total}`);
    for (const c of CUENTAS) {
      const u = await db.usuario.findUnique({ where: { email: c.email } });
      if (!u) { console.log(`  ${c.etiqueta} ${c.email}: NO EXISTE en esta base`); continue; }
      const coincide = c.pass ? await bcrypt.compare(c.pass, u.passwordHash) : null;
      console.log(
        `  ${c.etiqueta} ${c.email}: existe | ${u.activo ? "activo" : "INACTIVO"} | ` +
        `rol ${u.rol} | contraseña del archivo ${coincide === null ? "(no esta en el archivo)" : coincide ? "SI COINCIDE" : "NO COINCIDE"}`,
      );
      if (u.rol === "MAESTRO") {
        const m = await db.maestro.findUnique({ where: { usuarioId: u.id } });
        console.log(`    ficha de maestro: ${m ? (m.activo ? "existe y activa" : "existe pero INACTIVA") : "NO EXISTE (no podra entrar)"}`);
      }
    }
    const bloqueos = await db.intentoLogin.findMany();
    const ahora = Date.now();
    const activos = bloqueos.filter((b) => b.bloqueadoHasta && b.bloqueadoHasta.getTime() > ahora);
    console.log(`Bloqueos registrados: ${bloqueos.length} | activos ahora mismo: ${activos.length}`);
    for (const b of activos) {
      console.log(`    ${b.clave} bloqueado ${Math.ceil((b.bloqueadoHasta!.getTime() - ahora) / 60000)} min mas`);
    }
  } catch (e) {
    const msg = e instanceof Error ? (e.message || String(e)) : String(e);
    console.log("  NO SE PUDO CONECTAR. Mensaje completo:\n");
    console.log(msg.split("\n").map((l) => "    " + l).join("\n"));
  } finally {
    await db.$disconnect();
  }
}

(async () => {
  await revisar("BASE DIRECTA (la que usa el script)", directa);
  await revisar("BASE DEL POOLER (la que usa la app en Vercel)", pooler);
  console.log("\nSi una dice NO COINCIDE o NO EXISTE, ahi esta el problema.");
  console.log("Si las dos se ven bien, el problema no es la base.");
})();
