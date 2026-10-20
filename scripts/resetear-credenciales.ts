/**
 * Restablece las contraseñas del administrador y del maestro, y limpia los
 * bloqueos por intentos fallidos. Sirve para la base local o la de Neon.
 *
 * Uso:
 *   $env:DATABASE_URL="<cadena de la base>"
 *   npx tsx scripts/resetear-credenciales.ts
 *
 * Las contraseñas se leen de .env.produccion.txt (que está ignorado por Git).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";

const ARCHIVO = ".env.produccion.txt";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@colegio.test";
const MAESTRO_EMAIL = process.env.MAESTRO_EMAIL ?? "maestro@colegio.test";

// Busca la línea siguiente a la etiqueta, por ejemplo "ADMIN_PASSWORD:"
function leerDelArchivo(etiqueta: string): string | null {
  if (!existsSync(ARCHIVO)) return null;
  const lineas = readFileSync(ARCHIVO, "utf8").split(/\r?\n/);
  const i = lineas.findIndex((l) => l.trim().toUpperCase().startsWith(etiqueta));
  if (i < 0) return null;
  for (let j = i + 1; j < lineas.length; j++) {
    const v = lineas[j].trim();
    if (v) return v;
  }
  return null;
}

function obtener(nombre: string): string {
  // El archivo manda sobre la variable de entorno: una variable vieja o mal
  // pegada en la terminal no debe decidir la contraseña que queda en la base.
  const valor = leerDelArchivo(nombre) ?? process.env[nombre];
  if (valor && (valor.startsWith("<") || valor.includes(".env.produccion"))) {
    throw new Error(
      `El valor de ${nombre} es un texto de ejemplo ("${valor.slice(0, 30)}..."), no una contraseña real.`,
    );
  }
  if (!valor || valor.length < 8) {
    throw new Error(
      `No encontré ${nombre}. Ponlo en ${ARCHIVO} o defínelo como variable de entorno.`,
    );
  }
  return valor;
}

// La cadena de conexión también puede venir del archivo, con la etiqueta NEON_DATABASE_URL:
// Lee la cadena de conexion de .env.neon, que contiene solo la URL y nada mas.
function urlDeArchivoNeon(): string | null {
  if (!existsSync(".env.neon")) return null;
  const v = readFileSync(".env.neon", "utf8").trim().split(/\r?\n/)[0]?.trim();
  return v && v.startsWith("postgresql://") ? v : null;
}

const urlArchivo = leerDelArchivo("NEON_DATABASE_URL");
// El archivo manda sobre la variable de entorno, para que una variable vieja
// que haya quedado cargada en la terminal no apunte a la base equivocada.
const urlNeon = urlDeArchivoNeon() ?? urlArchivo;
if (urlNeon && urlNeon.startsWith("postgresql://")) {
  process.env.DATABASE_URL = urlNeon;
}

const prisma = new PrismaClient();

async function main() {
  const destino = (process.env.DATABASE_URL ?? "").match(/@([^/?]+)/)?.[1] ?? "(desconocido)";
  console.log(`Base de datos: ${destino}\n`);

  const adminPass = obtener("ADMIN_PASSWORD");
  const maestroPass = obtener("MAESTRO_PASSWORD");

  // --- Administrador ---
  const admin = await prisma.usuario.findUnique({ where: { email: ADMIN_EMAIL } });
  await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: await bcrypt.hash(adminPass, 10), activo: true },
    create: {
      nombre: "Administrador",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(adminPass, 10),
      rol: "ADMIN",
    },
  });
  console.log(admin ? `Administrador ${ADMIN_EMAIL}: contraseña actualizada`
                    : `Administrador ${ADMIN_EMAIL}: creado`);

  // --- Maestro (usuario + su registro en la tabla maestros) ---
  const maestroPrevio = await prisma.usuario.findUnique({ where: { email: MAESTRO_EMAIL } });
  const usuarioMaestro = await prisma.usuario.upsert({
    where: { email: MAESTRO_EMAIL },
    update: { passwordHash: await bcrypt.hash(maestroPass, 10), activo: true },
    create: {
      nombre: "Maestro Demo",
      email: MAESTRO_EMAIL,
      passwordHash: await bcrypt.hash(maestroPass, 10),
      rol: "MAESTRO",
    },
  });
  console.log(maestroPrevio ? `Maestro ${MAESTRO_EMAIL}: contraseña actualizada`
                            : `Maestro ${MAESTRO_EMAIL}: creado`);

  const ficha = await prisma.maestro.findUnique({ where: { usuarioId: usuarioMaestro.id } });
  if (!ficha) {
    await prisma.maestro.create({
      data: { usuarioId: usuarioMaestro.id, nombres: "Maestro", apellidos: "Demo", salarioMensual: 3500 },
    });
    console.log("Maestro: faltaba su ficha en la tabla maestros, la creé");
  } else if (!ficha.activo) {
    await prisma.maestro.update({ where: { id: ficha.id }, data: { activo: true } });
    console.log("Maestro: estaba inactivo, lo reactivé");
  }

  // --- Quitar bloqueos de login ---
  const { count } = await prisma.intentoLogin.deleteMany({});
  console.log(`\nBloqueos de login eliminados: ${count}`);

  // --- Resumen ---
  const usuarios = await prisma.usuario.findMany({
    select: { email: true, rol: true, activo: true },
    orderBy: { id: "asc" },
  });
  console.log("\nUsuarios en esta base:");
  for (const u of usuarios) console.log(`  ${u.email} | ${u.rol} | ${u.activo ? "activo" : "INACTIVO"}`);
  console.log("\nListo. Las contraseñas son las de .env.produccion.txt");
}

main()
  .catch((e) => { console.error("\nError:", e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
