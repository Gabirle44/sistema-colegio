"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { generarCargos } from "@/lib/cobros/cargos";
import { aEstadoError } from "@/lib/cobros/errores";
import { ErrorNegocio, type AccionState } from "@/lib/cobros/tipos";
import { hoyGT, parseCentavos, quetzales } from "@/lib/cobros/utils";

export async function crearInscripcion(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const alumnoId = Number(fd.get("alumnoId"));
  const seccionId = Number(fd.get("seccionId"));
  const montoIns = parseCentavos(fd.get("montoInscripcion"), { vacioEsCero: true });
  const montoMes = parseCentavos(fd.get("montoMensualidad"));
  const descIns = parseCentavos(fd.get("descuentoInscripcion"), { vacioEsCero: true });
  const descMes = parseCentavos(fd.get("descuentoMensualidad"), { vacioEsCero: true });
  const motivo = String(fd.get("motivoDescuento") ?? "").trim();

  if (!alumnoId) return { error: "Elige el alumno." };
  if (!seccionId) return { error: "Elige el grado y sección." };
  if (montoIns === null || montoMes === null || descIns === null || descMes === null) {
    return { error: "Revisa los montos: deben ser números válidos." };
  }
  if (montoMes <= 0) return { error: "La mensualidad debe ser mayor a cero." };
  if (descIns > montoIns) return { error: "El descuento de inscripción supera el monto." };
  if (descMes > montoMes) return { error: "El descuento de mensualidad supera el monto." };
  if ((descIns > 0 || descMes > 0) && motivo.length < 3) return { error: "Escribe el motivo del descuento." };

  let id: number;
  try {
    id = await prisma.$transaction(async (tx) => {
      const ciclo = await tx.cicloEscolar.findFirst({ where: { activo: true } });
      if (!ciclo) throw new ErrorNegocio("No hay un ciclo escolar activo.");
      const seccion = await tx.seccion.findUnique({ where: { id: seccionId } });
      if (!seccion || seccion.cicloId !== ciclo.id) throw new ErrorNegocio("Esa sección no es del ciclo activo.");
      const existe = await tx.inscripcion.findUnique({
        where: { alumnoId_cicloId: { alumnoId, cicloId: ciclo.id } },
      });
      if (existe) throw new ErrorNegocio("Ese alumno ya está inscrito en este ciclo.");

      const cfg = await tx.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
      const ins = await tx.inscripcion.create({
        data: {
          alumnoId, seccionId, cicloId: ciclo.id,
          montoInscripcion: (montoIns / 100).toFixed(2),
          montoMensualidad: (montoMes / 100).toFixed(2),
          descuentoInscripcion: (descIns / 100).toFixed(2),
          descuentoMensualidad: (descMes / 100).toFixed(2),
          motivoDescuento: motivo || null,
        },
      });
      await generarCargos(tx, ins, ciclo.anio, cfg, hoyGT());
      await registrarBitacora(tx, {
        usuarioId: sesion.userId, accion: "INSCRIPCION", entidad: "Inscripcion", entidadId: ins.id,
        detalle: `Alumno ${alumnoId}, mensualidad ${quetzales(montoMes)}`,
      });
      return ins.id;
    });
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/cobros/${id}`);
}
