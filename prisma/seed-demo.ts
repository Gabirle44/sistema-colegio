// Datos de prueba: 8 alumnos con inscripción, cuotas, pagos, notas y boleta.
// Se puede correr varias veces: lo que ya existe no se duplica.
import { PrismaClient, type Prisma } from "@prisma/client";
import { estadoSegunPago, generarCargos, netoCentavos, saldoCentavos } from "../src/lib/cobros/cargos";
import { aCentavos, deCentavos, hoyGT } from "../src/lib/cobros/utils";

const prisma = new PrismaClient();

const urlDb = (process.env.DATABASE_URL ?? "") + " " + (process.env.DIRECT_URL ?? "");
const esProduccion = process.env.NODE_ENV === "production" || /neon\.tech|production/i.test(urlDb);

if (esProduccion) {
  console.error(
    "SEED DEMO DETENIDO: este script no puede ejecutarse en producción ni contra una base de Neon. " +
      "Usa prisma/seed.ts para datos mínimos del sistema o cambia NODE_ENV/DATABASE_URL antes de correr esta demo.",
  );
  process.exit(1);
}

type Demo = {
  carnet: string; cui: string; nombres: string; apellidos: string; nac: string; tel: string;
  enc: string; telEnc: string; correo: string;
  descIns?: number; descMes?: number; motivo?: string;
  pagaIns: boolean; meses: number; parcial?: number; metodo: "EFECTIVO" | "TRANSFERENCIA" | "DEPOSITO"; ref?: string;
  anuladoUltimo?: boolean;
  nivel: number; // promedio aproximado de notas
  conducta: string; inasistencias: number; comentario?: string;
};

const ALUMNOS: Demo[] = [
  { carnet: "2026001", cui: "2501234560101", nombres: "Ana Lucía", apellidos: "Pérez Morales", nac: "2012-03-14", tel: "55502001", enc: "Carmen Morales", telEnc: "55501001", correo: "carmen.morales@correo.test", pagaIns: true, meses: 10, metodo: "EFECTIVO", nivel: 92, conducta: "Excelente", inasistencias: 0, comentario: "Excelente desempeño, sigue así." },
  { carnet: "2026002", cui: "2501234570101", nombres: "Luis Fernando", apellidos: "Gómez Ruiz", nac: "2011-08-02", tel: "55502002", enc: "Roberto Gómez", telEnc: "55501002", correo: "roberto.gomez@correo.test", pagaIns: true, meses: 8, metodo: "TRANSFERENCIA", ref: "TR-884201", nivel: 48, conducta: "Regular", inasistencias: 5, comentario: "Necesita reforzar Matemática en casa." },
  { carnet: "2026003", cui: "2501234580101", nombres: "María José", apellidos: "López Herrera", nac: "2012-11-21", tel: "55502003", enc: "Sandra Herrera", telEnc: "55501003", correo: "sandra.herrera@correo.test", descMes: 17500, motivo: "Beca 50%", pagaIns: true, meses: 3, metodo: "DEPOSITO", ref: "BI-5530921", nivel: 78, conducta: "Muy buena", inasistencias: 1 },
  { carnet: "2026004", cui: "2501234590101", nombres: "Carlos Andrés", apellidos: "Ramírez Soto", nac: "2011-05-09", tel: "55502004", enc: "Julio Ramírez", telEnc: "55501004", correo: "julio.ramirez@correo.test", pagaIns: false, meses: 0, metodo: "EFECTIVO", nivel: 35, conducta: "Deficiente", inasistencias: 9 },
  { carnet: "2026005", cui: "2501234600101", nombres: "Sofía Alejandra", apellidos: "Castillo Díaz", nac: "2012-01-30", tel: "55502005", enc: "Patricia Díaz", telEnc: "55501005", correo: "patricia.diaz@correo.test", descIns: 30000, motivo: "Hermano en el colegio", pagaIns: true, meses: 9, metodo: "EFECTIVO", nivel: 96, conducta: "Excelente", inasistencias: 0 },
  { carnet: "2026006", cui: "2501234610101", nombres: "Diego Alejandro", apellidos: "Méndez Cruz", nac: "2011-09-17", tel: "55502006", enc: "Héctor Méndez", telEnc: "55501006", correo: "hector.mendez@correo.test", pagaIns: true, meses: 5, parcial: 10000, metodo: "EFECTIVO", nivel: 66, conducta: "Buena", inasistencias: 2 },
  { carnet: "2026007", cui: "2501234620101", nombres: "Valeria Beatriz", apellidos: "Ortiz Vargas", nac: "2012-06-05", tel: "55502007", enc: "Gloria Vargas", telEnc: "55501007", correo: "gloria.vargas@correo.test", pagaIns: true, meses: 9, metodo: "TRANSFERENCIA", ref: "TR-771045", anuladoUltimo: true, nivel: 84, conducta: "Muy buena", inasistencias: 1 },
  { carnet: "2026008", cui: "2501234630101", nombres: "Javier Eduardo", apellidos: "Salazar Rojas", nac: "2011-12-26", tel: "55502008", enc: "Marta Rojas", telEnc: "55501008", correo: "marta.rojas@correo.test", pagaIns: true, meses: 6, metodo: "EFECTIVO", nivel: 55, conducta: "Regular", inasistencias: 4 },
];

// Variación por curso (Matemática, Comunicación, Ciencias) y por bimestre (I, II)
const OFFSETS = [[0, 3], [-4, 2], [5, -3]];

async function main() {
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: "admin@colegio.test" } });
  const ciclo = await prisma.cicloEscolar.findFirstOrThrow({ where: { activo: true } });
  const grado = await prisma.grado.findFirstOrThrow({ where: { nombre: "Primero Básico" } });
  const seccion = await prisma.seccion.findFirstOrThrow({ where: { nombre: "A", gradoId: grado.id, cicloId: ciclo.id } });
  const periodos = await prisma.periodo.findMany({ where: { cicloId: ciclo.id }, orderBy: { numero: "asc" } });
  const asignaciones = await prisma.asignacionCurso.findMany({
    where: { seccionId: seccion.id }, include: { curso: true }, orderBy: { cursoId: "asc" },
  });
  const cfg = await prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const d of ALUMNOS) {
    const alumno = await prisma.alumno.upsert({
      where: { carnet: d.carnet },
      update: {},
      create: {
        carnet: d.carnet, cui: d.cui, nombres: d.nombres, apellidos: d.apellidos,
        fechaNacimiento: new Date(`${d.nac}T00:00:00.000Z`), telefono: d.tel,
        encargadoNombre: d.enc, encargadoTelefono: d.telEnc, encargadoCorreo: d.correo,
      },
    });

    let ins = await prisma.inscripcion.findUnique({ where: { alumnoId_cicloId: { alumnoId: alumno.id, cicloId: ciclo.id } } });
    if (!ins) {
      await prisma.$transaction(async (tx) => {
        ins = await tx.inscripcion.create({
          data: {
            alumnoId: alumno.id, seccionId: seccion.id, cicloId: ciclo.id,
            montoInscripcion: "300.00", montoMensualidad: "350.00",
            descuentoInscripcion: deCentavos(d.descIns ?? 0), descuentoMensualidad: deCentavos(d.descMes ?? 0),
            motivoDescuento: d.motivo ?? null,
          },
        });
        await generarCargos(tx, ins, ciclo.anio, cfg, hoyGT());
        await pagar(tx, ins.id, d, admin.id);
      });
    }

    // Notas de los bimestres I y II en los cursos asignados al maestro demo
    const inscripcion = ins!;
    for (const [ci, asig] of asignaciones.entries()) {
      for (const [pi, periodo] of periodos.slice(0, 2).entries()) {
        const total = Math.max(0, Math.min(100, d.nivel + (OFFSETS[ci]?.[pi] ?? 0)));
        const zona = Math.round(total * 0.7);
        const examen = total - zona;
        const datos = { zona: zona.toFixed(2), examen: examen.toFixed(2), valor: total.toFixed(2), registradaPorId: asig.maestroId };
        await prisma.nota.upsert({
          where: { inscripcionId_cursoId_periodoId: { inscripcionId: inscripcion.id, cursoId: asig.cursoId, periodoId: periodo.id } },
          update: {},
          create: { inscripcionId: inscripcion.id, cursoId: asig.cursoId, periodoId: periodo.id, ...datos },
        });
      }
    }
    if (periodos[0]) {
      await prisma.boletaPeriodo.upsert({
        where: { inscripcionId_periodoId: { inscripcionId: inscripcion.id, periodoId: periodos[0].id } },
        update: {},
        create: { inscripcionId: inscripcion.id, periodoId: periodos[0].id, inasistencias: d.inasistencias, conducta: d.conducta, comentario: d.comentario ?? null },
      });
    }
  }
  console.log("Datos de prueba listos: 8 alumnos inscritos en Primero Básico A, con pagos y notas.");
}

async function pagar(tx: Prisma.TransactionClient, inscripcionId: number, d: Demo, adminId: number) {
  const cargos = await tx.cargo.findMany({ where: { inscripcionId }, orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }] });
  const lineas: { cargoId: number; centavos: number }[] = [];
  const inscripcion = cargos.find((c) => c.concepto === "INSCRIPCION");
  if (d.pagaIns && inscripcion && saldoCentavos(inscripcion) > 0) lineas.push({ cargoId: inscripcion.id, centavos: saldoCentavos(inscripcion) });
  const mensualidades = cargos.filter((c) => c.concepto === "MENSUALIDAD");
  mensualidades.slice(0, d.meses).forEach((c) => {
    if (saldoCentavos(c) > 0) lineas.push({ cargoId: c.id, centavos: saldoCentavos(c) });
  });
  if (d.parcial) {
    const siguiente = mensualidades[d.meses];
    if (siguiente) lineas.push({ cargoId: siguiente.id, centavos: d.parcial });
  }

  if (lineas.length > 0) {
    const total = lineas.reduce((s, l) => s + l.centavos, 0);
    await tx.recibo.create({
      data: {
        inscripcionId, total: deCentavos(total), metodo: d.metodo, referencia: d.ref ?? null,
        observaciones: "Datos de prueba", emitidoPorId: adminId, serie: "A",
        detalles: { create: lineas.map((l) => ({ cargoId: l.cargoId, monto: deCentavos(l.centavos) })) },
      },
    });
    for (const l of lineas) {
      const c = cargos.find((x) => x.id === l.cargoId)!;
      const pagado = aCentavos(c.pagado) + l.centavos;
      await tx.cargo.update({
        where: { id: c.id },
        data: { pagado: deCentavos(pagado), estado: estadoSegunPago(netoCentavos(c), pagado) },
      });
    }
  }

  // Un recibo anulado de ejemplo (no afectó ninguna cuota)
  if (d.anuladoUltimo) {
    const c = mensualidades[d.meses];
    if (c) {
      await tx.recibo.create({
        data: {
          inscripcionId, total: deCentavos(saldoCentavos(c)), metodo: "EFECTIVO", emitidoPorId: adminId, serie: "A",
          estado: "ANULADO", motivoAnulacion: "Recibo duplicado por error de caja", anuladoEn: new Date(), anuladoPorId: adminId,
          detalles: { create: [{ cargoId: c.id, monto: deCentavos(saldoCentavos(c)) }] },
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
