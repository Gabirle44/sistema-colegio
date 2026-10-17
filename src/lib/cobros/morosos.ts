import { prisma } from "@/lib/prisma";
import { aCentavos, esVencido, hoyGT } from "./utils";
import { saldoCentavos } from "./cargos";

export type Moroso = {
  inscripcionId: number;
  alumno: string;
  carnet: string;
  grado: string;
  seccion: string;
  cuotasVencidas: number;
  deudaVencida: number; // centavos
  masAntiguo: Date;
  encargado: string;
  telefono: string | null;
  correo: string | null;
};

export async function obtenerMorosos(opciones: { gradoId?: number; minCuotas?: number } = {}) {
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  const config = await prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!ciclo) return { ciclo: null, config, morosos: [] as Moroso[] };

  const cargos = await prisma.cargo.findMany({
    where: {
      estado: { in: ["PENDIENTE", "PARCIAL"] },
      fechaVencimiento: { lt: hoyGT() },
      inscripcion: {
        cicloId: ciclo.id,
        ...(opciones.gradoId ? { seccion: { gradoId: opciones.gradoId } } : {}),
        alumno: { activo: true },
      },
    },
    include: { inscripcion: { include: { alumno: true, seccion: { include: { grado: true } } } } },
    orderBy: { fechaVencimiento: "asc" },
  });

  const mapa = new Map<number, Moroso>();
  for (const c of cargos) {
    if (!esVencido(c.fechaVencimiento, config.diasGracia)) continue;
    const saldo = saldoCentavos(c);
    if (saldo <= 0) continue;
    const a = c.inscripcion.alumno;
    const existente = mapa.get(c.inscripcionId);
    if (existente) {
      existente.cuotasVencidas += 1;
      existente.deudaVencida += saldo;
    } else {
      mapa.set(c.inscripcionId, {
        inscripcionId: c.inscripcionId,
        alumno: `${a.apellidos}, ${a.nombres}`,
        carnet: a.carnet,
        grado: c.inscripcion.seccion.grado.nombre,
        seccion: c.inscripcion.seccion.nombre,
        cuotasVencidas: 1,
        deudaVencida: saldo,
        masAntiguo: c.fechaVencimiento,
        encargado: a.encargadoNombre,
        telefono: a.encargadoTelefono ?? a.telefono,
        correo: a.encargadoCorreo,
      });
    }
  }

  const minimo = opciones.minCuotas ?? 1;
  const morosos = [...mapa.values()]
    .filter((m) => m.cuotasVencidas >= minimo)
    .sort((a, b) => b.deudaVencida - a.deudaVencida);

  return { ciclo, config, morosos };
}

export const totalDeuda = (m: { deudaVencida: number }[]) =>
  m.reduce((s, x) => s + x.deudaVencida, 0);

export { aCentavos };
