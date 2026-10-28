import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import { fechaCorta } from "@/lib/cobros/utils";
import BotonVolver from "@/components/BotonVolver";
import { guardarEntregas } from "@/lib/tareas/actions";
import EntregasForm from "./EntregasForm"; 

type Props = { asignacionId: number; tareaId: number; volver: string };

export default async function CapturaEntregas({ asignacionId, tareaId, volver }: Props) {
  const actor = await requireActor();
  
  const tarea = await prisma.tarea.findUnique({
    where: { id: tareaId },
    include: { asignacion: { include: { curso: true, seccion: { include: { grado: true } } } } },
  });

  if (!tarea || tarea.asignacionId !== asignacionId) notFound();
  if (actor.rol === "MAESTRO" && tarea.asignacion.maestroId !== actor.maestroId) redirect("/maestro");

  const inscripciones = await prisma.inscripcion.findMany({
    where: { seccionId: tarea.asignacion.seccionId, cicloId: tarea.asignacion.seccion.cicloId, alumno: { activo: true } },
    include: { alumno: true },
    orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
  });

  const registros = await prisma.entregaTarea.findMany({
    where: { tareaId },
  });

  return (
    <div className="space-y-4">
      <BotonVolver href={volver}>Volver a tareas</BotonVolver>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Calificando Tarea • {tarea.asignacion.curso.nombre}
        </div>
        <h1 className="text-2xl font-bold leading-tight text-slate-800 mt-1">{tarea.titulo}</h1>
        <div className="mt-2 text-sm text-slate-600 flex gap-4">
            <span><strong>Valor:</strong> {Number(tarea.puntos)} pts</span>
            <span><strong>Entrega:</strong> {fechaCorta(tarea.fechaEntrega)}</span>
        </div>
      </div>

      <EntregasForm
        action={guardarEntregas.bind(null, tareaId)}
        puntosMaximos={Number(tarea.puntos)}
        filas={inscripciones.map((i) => {
          const r = registros.find((x) => x.inscripcionId === i.id);
          return {
            inscripcionId: i.id, 
            nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`, 
            carnet: i.alumno.carnet,
            entregado: r?.entregado ?? false, 
            nota: r?.nota ? Number(r.nota) : "",
          };
        })}
      />
    </div>
  );
}