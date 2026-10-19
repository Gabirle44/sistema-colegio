import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Límites del login. Si quieres hacerlos configurables, muévelos a la tabla Configuracion.
export const MAX_POR_CORREO = 5; // intentos fallidos seguidos sobre un mismo correo
export const MAX_POR_IP = 20; // intentos fallidos seguidos desde una misma red
export const BLOQUEO_MINUTOS = 15; // cuánto dura el bloqueo
const VENTANA_MINUTOS = 15; // si pasa este tiempo sin fallar, la cuenta vuelve a cero

const MIN_MS = 60_000;

// Dirección de quien intenta entrar. Detrás de Vercel o de un proxy viene en estas cabeceras.
export async function direccionIp(): Promise<string> {
  const h = await headers();
  const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || h.get("x-real-ip") || "desconocida";
}

export const claveCorreo = (correo: string) => `correo:${correo}`;
export const claveIp = (ip: string) => `ip:${ip}`;

export type Bloqueo = { bloqueado: true; minutos: number } | { bloqueado: false; restantes: number };

// Revisa si una clave está bloqueada ahora mismo.
async function revisar(clave: string, max: number): Promise<Bloqueo> {
  const r = await prisma.intentoLogin.findUnique({ where: { clave } });
  const ahora = Date.now();
  if (r?.bloqueadoHasta && r.bloqueadoHasta.getTime() > ahora) {
    return { bloqueado: true, minutos: Math.max(1, Math.ceil((r.bloqueadoHasta.getTime() - ahora) / MIN_MS)) };
  }
  const vigente = r && ahora - r.ultimoIntento.getTime() < VENTANA_MINUTOS * MIN_MS;
  return { bloqueado: false, restantes: Math.max(0, max - (vigente ? r.intentos : 0)) };
}

// Devuelve el bloqueo activo (correo o IP) o null si puede intentar.
export async function bloqueoActivo(correo: string, ip: string): Promise<Bloqueo & { bloqueado: true } | null> {
  const [porCorreo, porIp] = await Promise.all([
    revisar(claveCorreo(correo), MAX_POR_CORREO),
    revisar(claveIp(ip), MAX_POR_IP),
  ]);
  if (porCorreo.bloqueado) return porCorreo;
  if (porIp.bloqueado) return porIp;
  return null;
}

// Suma un fallo a una clave; devuelve true si con este se bloqueó.
async function sumarFallo(clave: string, max: number): Promise<boolean> {
  const ahora = new Date();
  const r = await prisma.intentoLogin.findUnique({ where: { clave } });
  const vigente = r && ahora.getTime() - r.ultimoIntento.getTime() < VENTANA_MINUTOS * MIN_MS;
  const intentos = (vigente ? r.intentos : 0) + 1;
  const bloquear = intentos >= max;
  const datos = {
    intentos: bloquear ? 0 : intentos,
    bloqueadoHasta: bloquear ? new Date(ahora.getTime() + BLOQUEO_MINUTOS * MIN_MS) : null,
  };
  await prisma.intentoLogin.upsert({ where: { clave }, update: datos, create: { clave, ...datos } });
  return bloquear;
}

// Registra un intento fallido. Devuelve cuántos intentos le quedan al correo (0 = quedó bloqueado).
export async function registrarFallo(correo: string, ip: string): Promise<{ bloqueado: boolean; restantes: number }> {
  const [bloqueoCorreo] = await Promise.all([
    sumarFallo(claveCorreo(correo), MAX_POR_CORREO),
    sumarFallo(claveIp(ip), MAX_POR_IP),
  ]);
  const estado = await revisar(claveCorreo(correo), MAX_POR_CORREO);
  return { bloqueado: bloqueoCorreo || estado.bloqueado, restantes: estado.bloqueado ? 0 : estado.restantes };
}

// Al entrar bien se limpia el contador, y de paso se borran los registros viejos.
export async function limpiarTrasExito(correo: string, ip: string): Promise<void> {
  const viejo = new Date(Date.now() - 24 * 60 * MIN_MS);
  await prisma.intentoLogin.deleteMany({
    where: { OR: [{ clave: { in: [claveCorreo(correo), claveIp(ip)] } }, { ultimoIntento: { lt: viejo } }] },
  });
}
