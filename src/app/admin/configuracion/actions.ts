"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { registrarBitacora } from "@/lib/cobros/bitacora";
import { aEstadoError } from "@/lib/cobros/errores";
import type { AccionState } from "@/lib/cobros/tipos";
import { parseCentavos } from "@/lib/cobros/utils";

const entero = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Number(String(v ?? ""));
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export async function guardarConfiguracion(_prev: AccionState, fd: FormData): Promise<AccionState> {
  const sesion = await requireAdmin();
  const nombreColegio = String(fd.get("nombreColegio") ?? "").trim();
  const direccion = String(fd.get("direccion") ?? "").trim();
  const telefono = String(fd.get("telefono") ?? "").trim();
  const serie = String(fd.get("serieRecibo") ?? "").trim().toUpperCase();
  const cantidad = entero(fd.get("cantidadMensualidades"), 1, 12);
  const mesInicio = entero(fd.get("mesInicio"), 1, 12);
  const dia = entero(fd.get("diaVencimiento"), 1, 28);
  const gracia = entero(fd.get("diasGracia"), 0, 60);
  const recargo = parseCentavos(fd.get("recargoMora"), { vacioEsCero: true });

  if (nombreColegio.length < 3) return { error: "Escribe el nombre del colegio." };
  if (!/^[A-Z0-9]{1,3}$/.test(serie)) return { error: "La serie del recibo debe ser de 1 a 3 letras o números." };
  if (cantidad === null) return { error: "Mensualidades por ciclo: entre 1 y 12." };
  if (mesInicio === null) return { error: "Mes de inicio: entre 1 y 12." };
  if (dia === null) return { error: "Día de vencimiento: entre 1 y 28." };
  if (gracia === null) return { error: "Días de gracia: entre 0 y 60." };
  if (recargo === null) return { error: "El recargo por mora debe ser un número válido." };

  const data = {
    nombreColegio, direccion, telefono, serieRecibo: serie,
    cantidadMensualidades: cantidad, mesInicio, diaVencimiento: dia, diasGracia: gracia,
    recargoMora: (recargo / 100).toFixed(2),
  };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.configuracion.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
      await registrarBitacora(tx, { usuarioId: sesion.userId, accion: "CONFIGURACION", entidad: "Configuracion", entidadId: 1 });
    });
  } catch (e) {
    return aEstadoError(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: "Configuración guardada. Aplica a inscripciones nuevas." };
}
