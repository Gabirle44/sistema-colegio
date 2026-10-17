"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { generarCargos } from "@/lib/cobros/cargos";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { aCentavos, deCentavos, hoyGT, parseCentavos } from "@/lib/cobros/utils";

// Inscribe en el ciclo activo a los alumnos de una sección del ciclo anterior
export async function promover(cicloOrigenId: number, cicloDestinoId: number, _prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const montoIns = parseCentavos(fd.get("montoInscripcion"), { vacioEsCero: true });
  const montoMes = parseCentavos(fd.get("montoMensualidad"));
  const mantener = fd.get("mantenerDescuentos") === "on";
  if (montoIns === null || montoMes === null || montoMes <= 0) return { error: "Revisa los montos: la mensualidad debe ser mayor a cero." };

  const destinos: { origenId: number; seccionId: number }[] = [];
  for (const [clave, valor] of fd.entries()) {
    const m = /^dest_(\d+)$/.exec(clave);
    const seccionId = Number(String(valor));
    if (m && Number.isInteger(seccionId) && seccionId > 0) destinos.push({ origenId: Number(m[1]), seccionId });
  }
  if (destinos.length === 0) return { error: "Elige a qué sección pasa al menos un alumno." };

  const ciclo = await prisma.cicloEscolar.findUnique({ where: { id: cicloDestinoId } });
  if (!ciclo) return { error: "El ciclo de destino no existe." };
  if (ciclo.id === cicloOrigenId) return { error: "El ciclo de origen y el de destino son el mismo." };
  const cfg = await prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  let hechos = 0;
  let yaInscritos = 0;
  const errores: string[] = [];
  for (const d of destinos) {
    try {
      const resultado = await prisma.$transaction(async (tx) => {
        const origen = await tx.inscripcion.findUnique({ where: { id: d.origenId }, include: { alumno: true } });
        if (!origen || origen.cicloId !== cicloOrigenId) throw new ErrorNegocio("Inscripción de origen no válida.");
        const seccion = await tx.seccion.findUnique({ where: { id: d.seccionId } });
        if (!seccion || seccion.cicloId !== ciclo.id) throw new ErrorNegocio("La sección elegida no es del ciclo de destino.");
        const existe = await tx.inscripcion.findUnique({ where: { alumnoId_cicloId: { alumnoId: origen.alumnoId, cicloId: ciclo.id } } });
        if (existe) return "ya" as const;

        const descIns = mantener ? Math.min(aCentavos(origen.descuentoInscripcion), montoIns) : 0;
        const descMes = mantener ? Math.min(aCentavos(origen.descuentoMensualidad), montoMes) : 0;
        const ins = await tx.inscripcion.create({
          data: {
            alumnoId: origen.alumnoId, seccionId: seccion.id, cicloId: ciclo.id,
            montoInscripcion: deCentavos(montoIns), montoMensualidad: deCentavos(montoMes),
            descuentoInscripcion: deCentavos(descIns), descuentoMensualidad: deCentavos(descMes),
            motivoDescuento: mantener && (descIns > 0 || descMes > 0) ? origen.motivoDescuento : null,
          },
        });
        await generarCargos(tx, ins, ciclo.anio, cfg, hoyGT());
        return "ok" as const;
      });
      if (resultado === "ya") yaInscritos++;
      else hechos++;
    } catch (e) {
      const r = aEstadoError(e);
      errores.push(r?.error ?? "Error");
    }
  }

  await registrarBitacora(prisma, {
    usuarioId: sesion.userId, accion: "PROMOCION", entidad: "Inscripcion",
    detalle: `${hechos} alumno(s) inscritos en el ciclo ${ciclo.anio}${yaInscritos ? `, ${yaInscritos} ya estaban inscritos` : ""}`,
  });
  revalidatePath("/admin", "layout");

  if (hechos === 0 && errores.length > 0) return { error: errores[0] };
  return {
    ok: `Listo: ${hechos} alumno(s) inscritos en ${ciclo.anio}.${yaInscritos ? ` ${yaInscritos} ya estaban inscritos.` : ""}${errores.length ? ` ${errores.length} con error.` : ""}`,
  };
}
