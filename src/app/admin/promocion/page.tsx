import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cargarBoletas } from "@/lib/notas/boleta";
import { fmtNota } from "@/lib/notas/calculo";
import { aCentavos, deCentavos } from "@/lib/cobros/utils";
import { inputCls, tarjeta } from "@/lib/ui";
import PromocionForm, { type FilaPromo } from "./PromocionForm";
import { promover } from "./actions";

type SP = Promise<{ origen?: string; destino?: string; seccion?: string }>;

export default async function PromocionPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const ciclos = await prisma.cicloEscolar.findMany({
    orderBy: { anio: "desc" },
    include: { _count: { select: { inscripciones: true } } },
  });

  const titulo = (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Promoción de fin de año</h1>
      <p className="text-sm text-slate-500">Inscribe a los alumnos de un ciclo en el siguiente, con sus cuotas nuevas.</p>
    </div>
  );

  if (ciclos.length < 2) {
    return (
      <div className="space-y-4">
        {titulo}
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Necesitas al menos dos ciclos. Crea el ciclo nuevo en <Link href="/admin/academico" className="underline">Estructura académica</Link>.
        </p>
      </div>
    );
  }

  // Origen: el que se elija, o el ciclo activo con alumnos, o el más reciente con alumnos
  const conAlumnos = ciclos.filter((c) => c._count.inscripciones > 0);
  const origen =
    ciclos.find((c) => String(c.id) === sp.origen) ??
    conAlumnos.find((c) => c.activo) ??
    conAlumnos[0] ??
    ciclos[0];
  // Destino: el que se elija, o el ciclo inmediato siguiente al origen
  const siguientes = ciclos.filter((c) => c.anio > origen.anio).sort((a, b) => a.anio - b.anio);
  const destino =
    ciclos.find((c) => String(c.id) === sp.destino && c.id !== origen.id) ??
    siguientes[0] ??
    ciclos.find((c) => c.id !== origen.id)!;

  const seccionesOrigen = await prisma.seccion.findMany({
    where: { cicloId: origen.id },
    include: { grado: true, _count: { select: { inscripciones: true } } },
    orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
  });
  const seccionOrigen = seccionesOrigen.find((s) => String(s.id) === sp.seccion);

  let formulario: React.ReactNode = null;
  if (seccionOrigen) {
    const [inscripciones, destinos] = await Promise.all([
      prisma.inscripcion.findMany({
        where: { seccionId: seccionOrigen.id, cicloId: origen.id, alumno: { activo: true } },
        orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
      }),
      prisma.seccion.findMany({ where: { cicloId: destino.id }, include: { grado: true }, orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }] }),
    ]);
    const { boletas } = await cargarBoletas(inscripciones.map((i) => i.id));
    const yaInscritos = await prisma.inscripcion.findMany({
      where: { cicloId: destino.id, alumnoId: { in: inscripciones.map((i) => i.alumnoId) } },
      select: { alumnoId: true },
    });
    const ya = new Set(yaInscritos.map((y) => y.alumnoId));

    // Sugerencia: aprobados al grado siguiente, reprobados repiten (misma letra de sección si existe)
    const ordenes = [...new Set(destinos.map((d) => d.grado.orden))].sort((a, b) => a - b);
    const siguienteOrden = ordenes.find((o) => o > seccionOrigen.grado.orden);
    const elegir = (orden: number | undefined) => {
      if (orden === undefined) return "";
      const delGrado = destinos.filter((d) => d.grado.orden === orden);
      return String((delGrado.find((d) => d.nombre === seccionOrigen.nombre) ?? delGrado[0])?.id ?? "");
    };
    const destAprobado = elegir(siguienteOrden);
    const destRepite = elegir(seccionOrigen.grado.orden);

    const filas: FilaPromo[] = inscripciones.map((i) => {
      const b = boletas.find((x) => x.inscripcionId === i.id);
      const resultado = b?.resultado ?? "EN_PROCESO";
      return {
        inscripcionId: i.id,
        nombre: b?.alumno.nombre ?? String(i.id),
        carnet: b?.alumno.carnet ?? "",
        promedio: fmtNota(b?.promedioGeneral),
        resultado,
        destino: ya.has(i.alumnoId) ? "" : resultado === "APROBADO" ? destAprobado : resultado === "REPROBADO" ? destRepite : "",
      };
    });
    const base = inscripciones[0];
    formulario = (
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800">
          {seccionOrigen.grado.nombre} {seccionOrigen.nombre}: ciclo {origen.anio} a ciclo {destino.anio}
        </h2>
        {!destino.activo && (
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            El ciclo {destino.anio} todavía no está activo. Puedes dejar las inscripciones listas y activarlo después en Estructura académica.
          </p>
        )}
        {ya.size > 0 && <p className="rounded-lg bg-slate-100 p-2 text-xs text-slate-600">{ya.size} alumno(s) ya están inscritos en {destino.anio} y no se volverán a inscribir.</p>}
        {destinos.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            El ciclo {destino.anio} no tiene secciones. Créalas en Estructura académica (al crear el ciclo puedes copiar las del anterior).
          </p>
        ) : filas.length === 0 ? (
          <p className="text-sm text-slate-500">No hay alumnos activos en esa sección.</p>
        ) : (
          <PromocionForm
            action={promover.bind(null, origen.id, destino.id)} filas={filas} key={`${origen.id}-${destino.id}-${seccionOrigen.id}`}
            secciones={destinos.map((d) => ({ id: d.id, texto: `${d.grado.nombre} ${d.nombre}` }))}
            montoIns={base ? deCentavos(aCentavos(base.montoInscripcion)) : "0.00"}
            montoMes={base ? deCentavos(aCentavos(base.montoMensualidad)) : "0.00"}
          />
        )}
        <p className="text-xs text-slate-500">
          Los reprobados vienen sugeridos para repetir grado y los &quot;en proceso&quot; sin destino; ajusta lo que necesites.
          Quien no se inscribe (por ejemplo, los que se gradúan) queda sin inscripción en {destino.anio}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {titulo}
      <form className={`${tarjeta} flex flex-wrap items-end gap-3`}>
        <div>
          <label className="text-xs text-slate-500">De (ciclo de origen)</label>
          <select name="origen" defaultValue={origen.id} className={inputCls}>
            {ciclos.map((c) => <option key={c.id} value={c.id}>{c.anio} · {c._count.inscripciones} inscritos{c.activo ? " (activo)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">A (ciclo de destino)</label>
          <select name="destino" defaultValue={destino.id} className={inputCls}>
            {ciclos.filter((c) => c.id !== origen.id).map((c) => <option key={c.id} value={c.id}>{c.anio}{c.activo ? " (activo)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Sección de origen</label>
          <select name="seccion" defaultValue={seccionOrigen?.id ?? ""} className={inputCls}>
            <option value="" disabled>Elige...</option>
            {seccionesOrigen.map((s) => <option key={s.id} value={s.id}>{s.grado.nombre} {s.nombre} ({s._count.inscripciones})</option>)}
          </select>
        </div>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100">Ver alumnos</button>
      </form>
      {formulario}
    </div>
  );
}
