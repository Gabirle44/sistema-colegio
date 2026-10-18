import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerConfig } from "@/lib/cobros/config";
import { mesGT } from "@/lib/cobros/utils";
import { requireActor } from "@/lib/notas/acceso";
import { pdfListaAsistencia } from "./pdf";

// Respuesta PDF compartida por la ruta del maestro y la del administrador
export async function respuestaListaAsistencia(asignacionId: number, mesParam: string | null) {
  const actor = await requireActor();
  if (!Number.isInteger(asignacionId)) notFound();
  const asig = await prisma.asignacionCurso.findUnique({
    where: { id: asignacionId },
    include: { curso: true, maestro: true, seccion: { include: { grado: true, ciclo: true } } },
  });
  if (!asig) notFound();
  if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) redirect("/maestro");

  const m = /^(\d{4})-(\d{2})$/.exec(mesParam ?? "") ?? /^(\d{4})-(\d{2})$/.exec(mesGT(new Date()))!;
  const anio = Number(m[1]);
  const mes = Math.min(12, Math.max(1, Number(m[2])));

  const inscripciones = await prisma.inscripcion.findMany({
    where: { seccionId: asig.seccionId, cicloId: asig.seccion.cicloId, alumno: { activo: true } },
    include: { alumno: true },
    orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
  });
  const cfg = await obtenerConfig();
  const bytes = await pdfListaAsistencia({
    colegio: { nombre: cfg.nombreColegio },
    curso: asig.curso.nombre, grado: asig.seccion.grado.nombre, seccion: asig.seccion.nombre,
    maestro: `${asig.maestro.nombres} ${asig.maestro.apellidos}`, ciclo: asig.seccion.ciclo.anio, anio, mes,
    alumnos: inscripciones.map((i) => ({ nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`, carnet: i.alumno.carnet })),
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="asistencia-${asig.curso.nombre.replace(/\W+/g, "_")}-${anio}-${String(mes).padStart(2, "0")}.pdf"`,
    },
  });
}
