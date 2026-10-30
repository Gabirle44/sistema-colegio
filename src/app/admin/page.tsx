import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { obtenerConfig } from "@/lib/cobros/config";
import { saldoCentavos, netoCentavos } from "@/lib/cobros/cargos";
import { obtenerMorosos, totalDeuda } from "@/lib/cobros/morosos";
import { aCentavos, diaMs, fechaHoraGT, horaGT, hoyGT, mesGT, MESES, quetzales } from "@/lib/cobros/utils";
import { tarjeta } from "@/lib/ui";

const GT_MS = 6 * 3_600_000;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const METODOS: Record<string, string> = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", DEPOSITO: "Depósito", CHEQUE: "Cheque" };
const corto = (m: number) => MESES[m].slice(0, 3);

// Inicio del mes (00:00 hora de Guatemala) desplazado `desp` meses
const inicioMes = (y: number, m: number, desp = 0) => new Date(Date.UTC(y, m + desp, 1, 6));

function Kpi({ titulo, valor, detalle, tono = "normal", href }: { titulo: string; valor: string; detalle: string; tono?: "normal" | "alerta"; href?: string }) {
  const cuerpo = (
    <div className={`${tarjeta} h-full ${tono === "alerta" ? "border-red-200" : ""} ${href ? "transition-colors hover:border-blue-600" : ""}`}>
      <div className="text-sm text-slate-500">{titulo}</div>
      <div className={`mt-1 text-3xl font-bold tracking-tight ${tono === "alerta" ? "text-red-600" : "text-slate-900"}`}>{valor}</div>
      <div className="mt-1 text-sm text-slate-500">{detalle}</div>
    </div>
  );
  return href ? <Link href={href}>{cuerpo}</Link> : cuerpo;
}

function Barras({ datos, resaltar }: { datos: { etiqueta: string; valor: number }[]; resaltar?: number }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <ul className="flex h-44 items-end gap-3" aria-label="Ingresos por mes">
      {datos.map((d, i) => (
        <li key={d.etiqueta} className="flex h-full flex-1 flex-col justify-end text-center" title={`${d.etiqueta}: ${quetzales(d.valor)}`}>
          <span className="mb-1 text-xs font-medium tabular-nums text-slate-600">{d.valor > 0 ? quetzales(d.valor).replace(/\.00$/, "") : "—"}</span>
          <span
            className={`block w-full rounded-t-md ${i === resaltar ? "bg-blue-700" : "bg-blue-200"}`}
            style={{ height: `${Math.max(d.valor > 0 ? 4 : 0, Math.round((d.valor / max) * 100))}%` }}
          />
          <span className="mt-2 text-xs text-slate-500">{d.etiqueta}</span>
        </li>
      ))}
    </ul>
  );
}

function BarrasH({ datos, color, vacio }: { datos: { etiqueta: string; valor: number; texto: string }[]; color: string; vacio: string }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  if (datos.length === 0) return <p className="text-sm text-slate-400">{vacio}</p>;
  return (
    <ul className="space-y-3">
      {datos.map((d) => (
        <li key={d.etiqueta} title={`${d.etiqueta}: ${d.texto}`}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-700">{d.etiqueta}</span>
            <span className="font-medium tabular-nums text-slate-800">{d.texto}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(3, Math.round((d.valor / max) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminPage() {
  const sesion = await requireAdmin();
  const [usuario, cfg, ciclo] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: sesion.userId } }),
    obtenerConfig(),
    prisma.cicloEscolar.findFirst({ where: { activo: true } }),
  ]);

  const hoy = hoyGT(); // medianoche UTC de la fecha de hoy en Guatemala
  const inicioHoy = new Date(hoy.getTime() + GT_MS);
  const finHoy = new Date(inicioHoy.getTime() + diaMs);
  const y = hoy.getUTCFullYear();
  const m = hoy.getUTCMonth();
  const mesActual = inicioMes(y, m);
  const desde6 = inicioMes(y, m, -5);
  const finMes = inicioMes(y, m, 1);
  const semana = new Date(hoy.getTime() + 7 * diaMs);

  const [recibos, anuladosHoy, morosoData, inscritos, nuevos, sinInscribir, vencenSemana, periodo, bitacora] = await Promise.all([
    prisma.recibo.findMany({ where: { estado: "VIGENTE", fecha: { gte: desde6 } }, select: { fecha: true, total: true, metodo: true } }),
    prisma.recibo.count({ where: { estado: "ANULADO", anuladoEn: { gte: inicioHoy, lt: finHoy } } }),
    obtenerMorosos(),
    ciclo ? prisma.inscripcion.count({ where: { cicloId: ciclo.id, alumno: { activo: true } } }) : 0,
    ciclo ? prisma.inscripcion.count({ where: { cicloId: ciclo.id, alumno: { activo: true, inscripciones: { none: { cicloId: { not: ciclo.id } } } } } }) : 0,
    ciclo ? prisma.alumno.count({ where: { activo: true, inscripciones: { none: { cicloId: ciclo.id } } } }) : 0,
    ciclo
      ? prisma.cargo.findMany({
          where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaVencimiento: { gte: hoy, lt: semana }, inscripcion: { cicloId: ciclo.id } },
          select: { monto: true, descuento: true, pagado: true },
        })
      : [],
    ciclo ? prisma.periodo.findFirst({ where: { cicloId: ciclo.id, abierto: true }, orderBy: { numero: "asc" } }) : null,
    prisma.bitacora.findMany({ orderBy: { id: "desc" }, take: 8, include: { usuario: true } }),
  ]);

  // ── Dinero ──
  const enRango = (f: Date, a: Date, b: Date) => f >= a && f < b;
  const cobradoHoy = recibos.filter((r) => enRango(r.fecha, inicioHoy, finHoy));
  const cobradoMes = recibos.filter((r) => enRango(r.fecha, mesActual, finMes));
  const sum = (rs: { total: unknown }[]) => rs.reduce((s, r) => s + aCentavos(r.total), 0);

  // Cuotas del mes: ya pagadas / total (solo las que vencen este mes, incluidas las ya pagadas)
  const cuotasDelMes = ciclo
    ? await prisma.cargo.findMany({
        where: { estado: { not: "ANULADO" }, concepto: "MENSUALIDAD", fechaVencimiento: { gte: new Date(Date.UTC(y, m, 1)), lt: new Date(Date.UTC(y, m + 1, 1)) }, inscripcion: { cicloId: ciclo.id } },
        select: { monto: true, descuento: true, pagado: true },
      })
    : [];
  const netoMes = cuotasDelMes.reduce((s, c) => s + netoCentavos(c), 0);
  const pagadoMes = cuotasDelMes.reduce((s, c) => s + Math.min(aCentavos(c.pagado), netoCentavos(c)), 0);
  const pctMes = netoMes > 0 ? Math.round((pagadoMes / netoMes) * 100) : null;

  const porMes = new Map<string, number>();
  for (const r of recibos) porMes.set(mesGT(r.fecha), (porMes.get(mesGT(r.fecha)) ?? 0) + aCentavos(r.total));
  const serie = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 5 + i, 1));
    return { etiqueta: corto(d.getUTCMonth()), valor: porMes.get(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`) ?? 0 };
  });

  const porMetodo = new Map<string, number>();
  for (const r of cobradoMes) porMetodo.set(r.metodo, (porMetodo.get(r.metodo) ?? 0) + aCentavos(r.total));
  const totalMes = sum(cobradoMes);
  const metodos = [...porMetodo].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
    etiqueta: METODOS[k] ?? k, valor: v, texto: `${quetzales(v)} · ${totalMes ? Math.round((v / totalMes) * 100) : 0}%`,
  }));

  // ── Mora ──
  const { morosos } = morosoData;
  const deudaMora = totalDeuda(morosos);
  const moraGrado = new Map<string, number>();
  for (const x of morosos) moraGrado.set(x.grado, (moraGrado.get(x.grado) ?? 0) + x.deudaVencida);
  const moraPorGrado = [...moraGrado].sort((a, b) => b[1] - a[1]).map(([g, v]) => ({ etiqueta: g, valor: v, texto: quetzales(v) }));
  const graves = morosos.filter((x) => x.cuotasVencidas >= 3).length;

  // ── Avance de notas del periodo abierto ──
  let cursosIncompletos: { texto: string; avance: string; pct: number }[] = [];
  let totalCursos = 0;
  if (ciclo && periodo) {
    const [asignaciones, notas, porSeccion] = await Promise.all([
      prisma.asignacionCurso.findMany({ where: { seccion: { cicloId: ciclo.id } }, include: { curso: true, maestro: true, seccion: { include: { grado: true } } } }),
      prisma.nota.findMany({ where: { periodoId: periodo.id }, select: { cursoId: true, inscripcion: { select: { seccionId: true } } } }),
      prisma.inscripcion.groupBy({ by: ["seccionId"], where: { cicloId: ciclo.id, alumno: { activo: true } }, _count: { _all: true } }),
    ]);
    const alumnos = new Map(porSeccion.map((p) => [p.seccionId, p._count._all]));
    const conteo = new Map<string, number>();
    for (const n of notas) conteo.set(`${n.inscripcion.seccionId}|${n.cursoId}`, (conteo.get(`${n.inscripcion.seccionId}|${n.cursoId}`) ?? 0) + 1);
    const filas = asignaciones
      .map((a) => ({ a, total: alumnos.get(a.seccionId) ?? 0, hechas: conteo.get(`${a.seccionId}|${a.cursoId}`) ?? 0 }))
      .filter((f) => f.total > 0);
    totalCursos = filas.length;
    cursosIncompletos = filas
      .filter((f) => f.hechas < f.total)
      .sort((x, y2) => x.hechas / x.total - y2.hechas / y2.total)
      .map((f) => ({
        texto: `${f.a.curso.nombre} · ${f.a.seccion.grado.nombre} ${f.a.seccion.nombre} (${f.a.maestro.nombres} ${f.a.maestro.apellidos})`,
        avance: `${f.hechas} de ${f.total}`,
        pct: Math.round((f.hechas / f.total) * 100),
      }));
  }

  const fecha = new Date(hoy);
  const fechaTexto = `${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()]}`;
  const saludo = (() => {
    const h = horaGT();
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  })();
  const primerNombre = usuario?.nombre.split(/\s+/)[0] ?? "";

  const vencenSaldo = vencenSemana.reduce((s, c) => s + Math.max(0, saldoCentavos(c)), 0);

  type Pend = { n: number; texto: string; detalle?: string; href: string; urgente?: boolean };
  const pendientes: Pend[] = [
    { n: morosos.length, texto: "alumnos con cuotas vencidas", detalle: `${quetzales(deudaMora)} en total${graves ? ` · ${graves} con 3 o más cuotas` : ""}`, href: "/admin/morosos", urgente: morosos.length > 0 },
    { n: vencenSemana.length, texto: "cuotas vencen en los próximos 7 días", detalle: vencenSemana.length ? quetzales(vencenSaldo) : undefined, href: "/admin/cobros" },
    { n: sinInscribir, texto: "alumnos activos sin inscribir en este ciclo", href: "/admin/inscripciones/nueva" },
    { n: anuladosHoy, texto: "recibos anulados hoy", detalle: "Revísalos en la bitácora", href: "/admin/bitacora" },
  ].filter((p) => p.n > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{saludo}{primerNombre ? `, ${primerNombre}` : ""}</h1>
        <p className="text-sm text-slate-500">{fechaTexto} · {ciclo ? `Ciclo escolar ${ciclo.anio}` : "No hay ciclo activo"}</p>
      </div>

      {/* Buscador grande */}
      <form action="/admin/cobros" className={`${tarjeta} space-y-3`}>
        <label htmlFor="q" className="text-sm font-medium text-slate-700">Cobrar o ver el estado de cuenta de un alumno</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="q" name="q" autoComplete="off" placeholder="Escribe el nombre, apellido o carnet..."
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
          <button className="rounded-lg bg-blue-700 px-6 py-3 text-base font-medium text-white hover:bg-blue-800">Buscar</button>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[["Nueva inscripción", "/admin/inscripciones/nueva"], ["Nuevo alumno", "/admin/alumnos/nuevo"], ["Cierre de caja de hoy", "/admin/caja"], ["Enviar recordatorios de mora", "/admin/morosos"]].map(([t, h]) => (
            <Link key={h} href={h} className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100">{t}</Link>
          ))}
        </div>
      </form>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Cobrado hoy" valor={quetzales(sum(cobradoHoy))} detalle={`${cobradoHoy.length} ${cobradoHoy.length === 1 ? "recibo" : "recibos"}`} href="/admin/caja" />
        <Kpi titulo={`Cobrado en ${MESES[m]}`} valor={quetzales(sum(cobradoMes))} detalle={pctMes === null ? "Sin cuotas este mes" : `${pctMes}% de las mensualidades del mes pagadas`} href="/admin/reportes" />
        <Kpi titulo="En mora" valor={quetzales(deudaMora)} detalle={`${morosos.length} ${morosos.length === 1 ? "alumno" : "alumnos"}${cfg.diasGracia ? ` (con ${cfg.diasGracia} días de gracia)` : ""}`} tono={deudaMora > 0 ? "alerta" : "normal"} href="/admin/morosos" />
        <Kpi titulo="Alumnos inscritos" valor={String(inscritos)} detalle={`${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"} en este ciclo`} href="/admin/alumnos" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pendientes */}
        <section className={`${tarjeta} lg:col-span-2`}>
          <h2 className="mb-3 font-semibold text-slate-900">Pendientes</h2>
          {pendientes.length === 0 && cursosIncompletos.length === 0 ? (
            <p className="text-sm text-slate-500">Todo al día. No hay pendientes por ahora.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendientes.map((p) => (
                <li key={p.texto}>
                  <Link href={p.href} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                    <span className={`mt-0.5 min-w-8 rounded-md px-2 py-0.5 text-center text-sm font-bold tabular-nums ${p.urgente ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{p.n}</span>
                    <span className="text-sm">
                      <span className="text-slate-800">{p.texto}</span>
                      {p.detalle && <span className="block text-slate-500">{p.detalle}</span>}
                    </span>
                  </Link>
                </li>
              ))}
              {periodo && cursosIncompletos.length > 0 && (
                <li className="py-2.5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 min-w-8 rounded-md bg-amber-50 px-2 py-0.5 text-center text-sm font-bold tabular-nums text-amber-700">{cursosIncompletos.length}</span>
                    <div className="text-sm">
                      <Link href="/admin/notas" className="text-slate-800 hover:underline">cursos con notas sin completar ({periodo.nombre})</Link>
                      <span className="block text-slate-500">de {totalCursos} cursos con maestro asignado</span>
                      <ul className="mt-2 space-y-1.5">
                        {cursosIncompletos.slice(0, 4).map((c) => (
                          <li key={c.texto} className="text-slate-600">
                            <div className="flex justify-between gap-3"><span>{c.texto}</span><span className="shrink-0 tabular-nums">{c.avance}</span></div>
                            <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${Math.max(3, c.pct)}%` }} /></div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          )}
          {!periodo && ciclo && <p className="mt-3 text-sm text-slate-500">No hay periodo de notas abierto.</p>}
        </section>

        {/* Ingresos 6 meses */}
        <section className={`${tarjeta} lg:col-span-3`}>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold text-slate-900">Ingresos de los últimos 6 meses</h2>
            <Link href="/admin/reportes" className="text-sm text-blue-700 hover:underline">Descargar detalle</Link>
          </div>
          <Barras datos={serie} resaltar={5} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={tarjeta}>
          <h2 className="mb-4 font-semibold text-slate-900">Mora por grado</h2>
          <BarrasH datos={moraPorGrado} color="bg-red-500" vacio="Ningún grado tiene cuotas vencidas." />
        </section>
        <section className={tarjeta}>
          <h2 className="mb-4 font-semibold text-slate-900">Cómo pagan este mes</h2>
          <BarrasH datos={metodos} color="bg-blue-600" vacio="Todavía no hay pagos este mes." />
        </section>
      </div>

      <section className={tarjeta}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold text-slate-900">Actividad reciente</h2>
          <Link href="/admin/bitacora" className="text-sm text-blue-700 hover:underline">Ver bitácora completa</Link>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {bitacora.map((b) => (
            <li key={b.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
              <span className="w-32 shrink-0 tabular-nums text-slate-400">{fechaHoraGT(b.creadoEn)}</span>
              <span className="w-28 shrink-0 text-slate-600">{b.usuario.nombre}</span>
              <span className="text-slate-800">{b.detalle ?? b.accion}</span>
            </li>
          ))}
          {bitacora.length === 0 && <li className="py-2 text-slate-400">Aún no hay movimientos.</li>}
        </ul>
      </section>
    </div>
  );
}
