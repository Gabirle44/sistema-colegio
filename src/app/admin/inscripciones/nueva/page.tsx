import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import InscripcionForm from "./InscripcionForm";
import BotonVolver from "@/components/BotonVolver";

export default async function NuevaInscripcionPage() {
  await requireAdmin();
  const ciclo = await prisma.cicloEscolar.findFirst({ where: { activo: true } });
  if (!ciclo) {
    return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay un ciclo escolar activo. Crea o activa uno primero.</p>;
  }
  const [alumnos, secciones] = await Promise.all([
    prisma.alumno.findMany({
      where: { activo: true, inscripciones: { none: { cicloId: ciclo.id } } },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      take: 1000,
    }),
    prisma.seccion.findMany({
      where: { cicloId: ciclo.id },
      include: { grado: true },
      orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <BotonVolver href="/admin/cobros">Cobros</BotonVolver>
      <h1 className="mt-1 text-2xl font-bold text-slate-800">Nueva inscripción · Ciclo {ciclo.anio}</h1>
      <p className="mb-4 text-sm text-slate-500">Al inscribir se generan automáticamente la inscripción y todas las mensualidades del ciclo.</p>
      {alumnos.length === 0 || secciones.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {alumnos.length === 0 ? "No hay alumnos activos sin inscribir. " : ""}
          {secciones.length === 0 ? "No hay secciones en el ciclo activo." : ""}
        </p>
      ) : (
        <InscripcionForm
          alumnos={alumnos.map((a) => ({ id: a.id, texto: `${a.apellidos}, ${a.nombres} (${a.carnet})` }))}
          secciones={secciones.map((s) => ({ id: s.id, texto: `${s.grado.nombre} - ${s.nombre}` }))}
        />
      )}
    </div>
  );
}
