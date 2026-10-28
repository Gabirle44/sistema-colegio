import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { fechaCorta } from "@/lib/cobros/utils";
import BotonVolver from "@/components/BotonVolver";
import { crearTarea } from "@/lib/tareas/actions";
import TareaNuevaForm from "./TareaNuevaForm"; 
import BotonImprimir from "../BotonImprimir";

type Props = { asignacionId: number; base: string; volver: string };

export default async function ListaTareas({ asignacionId, base, volver }: Props) {
  const actor = await requireActor();
  const asig = await prisma.asignacionCurso.findUnique({
    where: { id: asignacionId },
    include: { curso: true, maestro: true, seccion: { include: { grado: true, ciclo: true } } },
  });
  
  
  if (!asig) notFound();
  if (actor.rol === "MAESTRO" && asig.maestroId !== actor.maestroId) redirect("/maestro");

  const tareas = await prisma.tarea.findMany({
    where: { asignacionId },
    orderBy: { fechaEntrega: "desc" },
    include: {
      _count: { select: { entregas: true } },
    }
  });

  const inscripcionesCount = await prisma.inscripcion.count({
    where: { seccionId: asig.seccionId, cicloId: asig.seccion.cicloId, alumno: { activo: true } }
  });

  return (
    <div className="space-y-4">
      <BotonVolver href={volver}>Volver a mis cursos</BotonVolver>

      {/* Encabezado (Idéntico a tu diseño) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4 p-5">
         <div className="flex items-center justify-between print:hidden">
        <BotonVolver href={volver}>Volver a mis cursos</BotonVolver>
        
      </div>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Tareas y Entregas</div>
            <h1 className="truncate text-2xl font-bold leading-tight text-slate-800">{asig.curso.nombre}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">{asig.seccion.grado.nombre} {asig.seccion.nombre}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">Ciclo {asig.seccion.ciclo.anio}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{inscripcionesCount} alumno(s)</span><BotonImprimir />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Columna Izquierda: Formulario para crear Tarea */}
        <div className="md:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-800">Publicar Nueva Tarea</h2>
                <TareaNuevaForm action={crearTarea.bind(null, asignacionId)} />
            </div>
        </div>

        {/* Columna Derecha: Lista de tareas publicadas */}
        <div className="md:col-span-2 space-y-3">
            {tareas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <div className="text-sm font-medium text-slate-700">No hay tareas publicadas</div>
                    <div className="mt-1 text-xs text-slate-500">Usa el formulario para crear la primera tarea.</div>
                </div>
            ) : (
                tareas.map((t) => (
                    <Link key={t.id} href={`${base}/${asignacionId}/${t.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{t.titulo}</h3>
                                {t.descripcion && <p className="text-sm text-slate-500 mt-1">{t.descripcion}</p>}
                            </div>
                            <div className="text-right">
                                <span className="inline-block rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                    {Number(t.puntos)} pts
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                            <div>Vence: <strong className="text-slate-700">{fechaCorta(t.fechaEntrega)}</strong></div>
                            <div>{t._count.entregas} de {inscripcionesCount} entregas calificadas</div>
                        </div>
                    </Link>
                ))
            )}
        </div>
      </div>
    </div>
  );
}