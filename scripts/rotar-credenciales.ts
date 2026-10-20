/**
 * Genera contrasenas nuevas para admin y maestro, y un SESSION_SECRET nuevo,
 * y los escribe en .env.produccion.txt y en .env (ambos ignorados por Git).
 *
 * IMPORTANTE: cierra el Bloc de notas antes de correrlo. Si lo dejas abierto
 * con la version vieja y le das Ctrl+S, Windows escribe encima y pierdes las
 * contrasenas nuevas.
 *
 * Uso:  npx tsx scripts/rotar-credenciales.ts
 * Despues:  npx tsx scripts/resetear-credenciales.ts
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const ARCHIVO = ".env.produccion.txt";
const ENV = ".env";

// Sin caracteres que se confunden (l, I, O, 0, 1) ni que rompen PowerShell ($ & ! ` " ')
const ABC = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-._~#%+=";

function clave(n: number): string {
  let s = "";
  const limite = 256 - (256 % ABC.length);
  while (s.length < n) {
    const b = randomBytes(1)[0];
    if (b < limite) s += ABC[b % ABC.length];
  }
  return s;
}

if (!existsSync(ARCHIVO)) {
  console.error(`No encontre ${ARCHIVO}. Corre esto desde la raiz del proyecto.`);
  process.exit(1);
}

// Respaldo por si algo sale mal
copyFileSync(ARCHIVO, `${ARCHIVO}.anterior`);

const admin = clave(20);
const maestro = clave(20);
const secreto = randomBytes(48).toString("base64url");

const lineas = readFileSync(ARCHIVO, "utf8").split(/\r?\n/);
function reemplazar(etiqueta: string, valor: string) {
  const i = lineas.findIndex((l) => l.trim().toUpperCase().startsWith(etiqueta));
  if (i < 0) throw new Error(`No encontre la etiqueta ${etiqueta} en ${ARCHIVO}`);
  for (let j = i + 1; j < lineas.length; j++) {
    if (lineas[j].trim()) { lineas[j] = valor; return; }
  }
  throw new Error(`No habia linea de valor debajo de ${etiqueta}`);
}
reemplazar("ADMIN_PASSWORD", admin);
reemplazar("MAESTRO_PASSWORD", maestro);
reemplazar("SESSION_SECRET", secreto);
writeFileSync(ARCHIVO, lineas.join("\r\n"), "utf8");

// El .env local, para que la base local y la de la nube usen las mismas
if (existsSync(ENV)) {
  let env = readFileSync(ENV, "utf8");
  env = env.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${admin}`);
  env = env.replace(/^MAESTRO_PASSWORD=.*$/m, `MAESTRO_PASSWORD=${maestro}`);
  writeFileSync(ENV, env, "utf8");
}

console.log("Contrasenas nuevas escritas.");
console.log(`  ${ARCHIVO}  (respaldo del anterior en ${ARCHIVO}.anterior)`);
console.log(`  ${ENV}`);
console.log("");
console.log("Ahora corre:  npx tsx scripts/resetear-credenciales.ts");
console.log("Y recien despues abre el archivo para leerlas.");
