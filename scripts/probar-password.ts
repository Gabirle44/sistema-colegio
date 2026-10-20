/**
 * Comprueba si lo que estas escribiendo en el login es realmente la
 * contrasena guardada en la base. No muestra la contrasena en pantalla:
 * solo dice si sirve y, si no sirve, en que se diferencia.
 *
 * Uso:  npx tsx scripts/probar-password.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

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

function urlDeArchivoNeon(): string | null {
  if (!existsSync(".env.neon")) return null;
  const v = readFileSync(".env.neon", "utf8").trim().split(/\r?\n/)[0]?.trim();
  return v && v.startsWith("postgresql://") ? v : null;
}

const url = urlDeArchivoNeon() ?? process.env.DATABASE_URL ?? leer("NEON_DATABASE_URL");
if (!url) {
  console.error(`No encontre la cadena de Neon. Revisa .env.neon o ${ARCHIVO}`);
  process.exit(1);
}
process.env.DATABASE_URL = url.replace("-pooler.", ".");

// Describe un texto sin revelarlo: largo y tipos de caracter.
function describir(t: string): string {
  const partes: string[] = [`${t.length} caracteres`];
  if (/^\s|\s$/.test(t)) partes.push("ATENCION: empieza o termina con espacio");
  if (/\r|\n/.test(t)) partes.push("ATENCION: trae un salto de linea pegado");
  if (/[A-Z]/.test(t)) partes.push("tiene mayusculas");
  if (/[a-z]/.test(t)) partes.push("tiene minusculas");
  if (/[0-9]/.test(t)) partes.push("tiene numeros");
  if (/[^A-Za-z0-9]/.test(t)) partes.push("tiene simbolos");
  return partes.join(" | ");
}

const prisma = new PrismaClient();

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const correo = (await rl.question("Correo que estas usando en el login: ")).trim();
  console.log("\nAhora PEGA (Ctrl+V o clic derecho) la contrasena, tal como la pegas en el login.");
  console.log("No se va a comparar con nada mas que con la base. Enter al final.\n");
  const intento = await rl.question("Contrasena: ");
  rl.close();

  const usuario = await prisma.usuario.findUnique({ where: { email: correo } });
  if (!usuario) {
    console.log(`\nNo existe ningun usuario con el correo "${correo}".`);
    console.log("Revisa que no le hayas puesto un espacio al final o una letra de mas.");
    return;
  }

  const sirve = await bcrypt.compare(intento, usuario.passwordHash);
  const delArchivo = leer(correo.startsWith("admin") ? "ADMIN_PASSWORD" : "MAESTRO_PASSWORD");

  console.log("\n==================================================");
  console.log(`Usuario encontrado: ${usuario.email} | rol ${usuario.rol} | ${usuario.activo ? "activo" : "INACTIVO"}`);
  console.log("==================================================");
  console.log(`Lo que pegaste:        ${describir(intento)}`);
  if (delArchivo) console.log(`Lo que dice el archivo: ${describir(delArchivo)}`);
  console.log("");

  if (sirve) {
    console.log(">>> ESTA CONTRASENA SI SIRVE. <<<");
    console.log("Si aun asi el sitio te rechaza, el problema no es la contrasena:");
    console.log("es que Vercel esta hablando con otra base, o falta el Redeploy.");
  } else {
    console.log(">>> ESTA CONTRASENA NO ES LA QUE TIENE LA BASE. <<<");
    if (delArchivo && intento.length !== delArchivo.length) {
      console.log(`Pegaste ${intento.length} caracteres y la buena tiene ${delArchivo.length}.`);
      console.log("Lo mas probable: te falto un pedazo al seleccionar, o se colo un espacio.");
    } else {
      console.log("Tienen el mismo largo, asi que cambia algun caracter.");
      console.log("Vuelve a copiarla del Bloc de notas con triple clic sobre la linea + Ctrl+C.");
    }
  }
}

main()
  .catch((e) => { console.error("\nError:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
