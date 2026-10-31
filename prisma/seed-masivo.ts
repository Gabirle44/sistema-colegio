// Datos de prueba masivos: decenas de alumnos repartidos en varias secciones,
// con inscripciones, cuotas, pagos variados, notas, boletas y asistencia.
//
// Uso:   npm run seed:masivo            (60 alumnos)
//        npm run seed:masivo -- 100     (100 alumnos)
//
// Se puede correr varias veces: lo que ya existe no se duplica.
// SOLO para la base local. Se detiene si detecta producción o Neon.
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { estadoSegunPago, generarCargos, netoCentavos, saldoCentavos } from "../src/lib/cobros/cargos";
import { aCentavos, deCentavos, hoyGT } from "../src/lib/cobros/utils";

const prisma = new PrismaClient();

const urlDb = (process.env.DATABASE_URL ?? "") + " " + (process.env.DIRECT_URL ?? "");
const esProduccion = process.env.NODE_ENV === "production" || /neon\.tech|production/i.test(urlDb);
// Solo se permite en producción con confirmación explícita y contraseña propia
if (esProduccion && (process.env.PERMITIR_SEED_PRODUCCION !== "si" || !process.env.MAESTRO_PASSWORD)) {
  console.error(
    "SEED MASIVO DETENIDO: la base parece de producción/Neon.\n" +
      "Para cargarlo a propósito define PERMITIR_SEED_PRODUCCION=si y MAESTRO_PASSWORD (contraseña de los maestros de prueba).",
  );
  process.exit(1);
}

const CANTIDAD = Math.min(300, Math.max(1, Number(process.argv[2]) || 60));

// Generador pseudoaleatorio con semilla fija: siempre salen los mismos alumnos
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2026);
const entre = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const elegir = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];

const NOMBRES = ["Ana Lucía", "Luis Fernando", "María José", "Carlos Andrés", "Sofía Alejandra", "Diego Alejandro", "Valeria Beatriz", "Javier Eduardo", "Andrea Michelle", "Kevin Estuardo", "Daniela Fernanda", "José Manuel", "Paola Andrea", "Pedro Antonio", "Gabriela Nicole", "Marco Tulio", "Karla Patricia", "Jonathan Ariel", "Lucía Mariana", "Oscar Rodrigo", "Brenda Lizeth", "Henry Alexander", "Mónica Esperanza", "Erick Samuel", "Fátima Rebeca"];
const APELLIDOS = ["Pérez", "Gómez", "López", "Ramírez", "Castillo", "Méndez", "Ortiz", "Salazar", "Morales", "Herrera", "Díaz", "Cruz", "Vargas", "Rojas", "Soto", "García", "Hernández", "Martínez", "Juárez", "Chávez", "Aguilar", "Estrada", "Barrios", "Cifuentes", "Monterroso"];
const ENCARGADOS = ["Carmen", "Roberto", "Sandra", "Julio", "Patricia", "Héctor", "Gloria", "Marta", "Rosa", "Miguel", "Elena", "Ricardo", "Silvia", "Ángel"];
const CONDUCTAS = ["Excelente", "Muy buena", "Buena", "Regular", "Deficiente"];
const METODOS = ["EFECTIVO", "TRANSFERENCIA", "DEPOSITO"] as const;

const GRADOS = [
  { nombre: "Primero Básico", orden: 1 },
  { nombre: "Segundo Básico", orden: 2 },
  { nombre: "Tercero Básico", orden: 3 },
];
const SECCIONES = ["A", "B"];
const CURSOS = ["Matemática", "Comunicación y Lenguaje", "Ciencias Naturales"];

const MAESTROS = [
  { nombres: "Laura Beatriz", apellidos: "Mejía Ramos", email: "laura.mejia@colegio.test", salario: 4200 },
  { nombres: "Roberto Carlos", apellidos: "Fuentes Paz", email: "roberto.fuentes@colegio.test", salario: 3800 },
  { nombres: "Ingrid Johana", apellidos: "Santos Lima", email: "ingrid.santos@colegio.test", salario: 4000 },
  { nombres: "Mario Estuardo", apellidos: "Castañeda Gil", email: "mario.castaneda@colegio.test", salario: 3600 },
  { nombres: "Claudia Judith", apellidos: "Orellana Ruiz", email: "claudia.orellana@colegio.test", salario: 4500 },
  { nombres: "Fredy Armando", apellidos: "Lemus Toj", email: "fredy.lemus@colegio.test", salario: 3500 },
];

async function main() {
  const admin = await prisma.usuario.findFirstOrThrow({ where: { rol: "ADMIN" }, orderBy: { id: "asc" } });
  const demo = await prisma.maestro.findFirst({ orderBy: { id: "asc" } });
  // Más maestros, cada uno con su usuario para poder iniciar sesión
  const hash = await bcrypt.hash(process.env.MAESTRO_PASSWORD ?? "Maestro2026!", 10);
  const maestros = demo ? [demo] : [];
  for (const m of MAESTROS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: m.email }, update: {},
      create: { nombre: `${m.nombres} ${m.apellidos}`, email: m.email, passwordHash: hash, rol: "MAESTRO" },
    });
    maestros.push(await prisma.maestro.upsert({
      where: { usuarioId: usuario.id }, update: {},
      create: { usuarioId: usuario.id, nombres: m.nombres, apellidos: m.apellidos, salarioMensual: m.salario },
    }));
  }
  let turno = 0;
  const ciclo =
    (await prisma.cicloEscolar.findFirst({ where: { activo: true } })) ??
    (await prisma.cicloEscolar.upsert({ where: { anio: 2026 }, update: { activo: true }, create: { anio: 2026, activo: true } }));
  for (const [i, nombre] of ["Bimestre I", "Bimestre II", "Bimestre III", "Bimestre IV"].entries()) {
    await prisma.periodo.upsert({
      where: { cicloId_numero: { cicloId: ciclo.id, numero: i + 1 } }, update: {}, create: { cicloId: ciclo.id, numero: i + 1, nombre },
    });
  }
  const periodos = await prisma.periodo.findMany({ where: { cicloId: ciclo.id }, orderBy: { numero: "asc" } });
  const cfg = await prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  // 1. Estructura: grados, secciones, cursos y asignaciones al maestro demo
  const secciones: { id: number; asignaciones: { id: number; cursoId: number; maestroId: number }[] }[] = [];
  for (const g of GRADOS) {
    const grado = await prisma.grado.upsert({ where: { nombre: g.nombre }, update: {}, create: g });
    const cursos = [];
    for (const nombre of CURSOS) {
      cursos.push(await prisma.curso.upsert({
        where: { gradoId_nombre: { gradoId: grado.id, nombre } }, update: {}, create: { gradoId: grado.id, nombre },
      }));
    }
    for (const nombre of SECCIONES) {
      const seccion = await prisma.seccion.upsert({
        where: { gradoId_cicloId_nombre: { gradoId: grado.id, cicloId: ciclo.id, nombre } },
        update: {}, create: { nombre, gradoId: grado.id, cicloId: ciclo.id },
      });
      const asignaciones = [];
      for (const curso of cursos) {
        asignaciones.push(await prisma.asignacionCurso.upsert({
          where: { cursoId_seccionId: { cursoId: curso.id, seccionId: seccion.id } },
          update: {}, create: { maestroId: maestros[turno++ % maestros.length].id, cursoId: curso.id, seccionId: seccion.id },
        }));
      }
      secciones.push({ id: seccion.id, asignaciones });
    }
  }

  // Últimos 10 días hábiles (para la asistencia)
  const hoy = hoyGT();
  const dias: Date[] = [];
  for (let i = 1; dias.length < 10; i++) {
    const d = new Date(hoy.getTime() - i * 86_400_000);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) dias.push(d);
  }

  // 2. Alumnos
  let nuevos = 0;
  for (let i = 0; i < CANTIDAD; i++) {
    const n = 100 + i;
    const apellido1 = APELLIDOS[i % APELLIDOS.length];
    const apellido2 = elegir(APELLIDOS);
    const nombres = NOMBRES[(i * 7) % NOMBRES.length];
    const carnet = `2026${n}`;
    const existente = await prisma.alumno.findUnique({ where: { carnet } });
    const alumno = existente ?? await prisma.alumno.create({
      data: {
        carnet, cui: `26${String(n).padStart(11, "0")}`, nombres, apellidos: `${apellido1} ${apellido2}`,
        fechaNacimiento: new Date(Date.UTC(entre(2009, 2013), entre(0, 11), entre(1, 28))),
        telefono: `5${entre(1000000, 9999999)}`,
        encargadoNombre: `${elegir(ENCARGADOS)} ${apellido1}`,
        encargadoTelefono: `4${entre(1000000, 9999999)}`,
        encargadoCorreo: `encargado${n}@correo.test`,
      },
    });
    if (existente && (await prisma.inscripcion.count({ where: { alumnoId: alumno.id } })) > 0) continue;
    nuevos++;

    const seccion = secciones[i % secciones.length];
    // Perfil de pago y de rendimiento
    const r = rnd();
    const meses = r < 0.45 ? 10 : r < 0.7 ? entre(6, 9) : r < 0.9 ? entre(2, 5) : 0;
    const pagaIns = rnd() < 0.88;
    const beca = rnd() < 0.1;
    const parcial = rnd() < 0.15 ? entre(5, 25) * 1000 : 0;
    const nivel = Math.max(25, Math.min(99, Math.round(72 + (rnd() + rnd() + rnd() - 1.5) * 40)));
    const metodo = elegir(METODOS);

    const ins = await prisma.$transaction(async (tx) => {
      const ins = await tx.inscripcion.create({
        data: {
          alumnoId: alumno.id, seccionId: seccion.id, cicloId: ciclo.id,
          montoInscripcion: "300.00", montoMensualidad: "350.00",
          descuentoInscripcion: "0.00", descuentoMensualidad: deCentavos(beca ? 17500 : 0),
          motivoDescuento: beca ? "Beca 50%" : null,
        },
      });
      await generarCargos(tx, ins, ciclo.anio, cfg, hoy);
      await pagar(tx, ins.id, { pagaIns, meses, parcial, metodo, ref: metodo === "EFECTIVO" ? undefined : `REF-${n}${entre(100, 999)}` }, admin.id);
      return ins;
    }, { maxWait: 60_000, timeout: 120_000 });

    // Notas de los bimestres I y II
    for (const asig of seccion.asignaciones) {
      for (const periodo of periodos.slice(0, 2)) {
        const total = Math.max(0, Math.min(100, nivel + entre(-8, 8)));
        const zona = Math.round(total * 0.7);
        await prisma.nota.create({
          data: {
            inscripcionId: ins.id, cursoId: asig.cursoId, periodoId: periodo.id,
            zona: zona.toFixed(2), examen: (total - zona).toFixed(2), valor: total.toFixed(2), registradaPorId: asig.maestroId,
          },
        });
      }
    }
    if (periodos[0]) {
      await prisma.boletaPeriodo.create({
        data: {
          inscripcionId: ins.id, periodoId: periodos[0].id, inasistencias: nivel < 50 ? entre(4, 9) : entre(0, 3),
          conducta: nivel >= 90 ? CONDUCTAS[0] : nivel >= 75 ? CONDUCTAS[1] : nivel >= 60 ? CONDUCTAS[2] : nivel >= 45 ? CONDUCTAS[3] : CONDUCTAS[4],
          comentario: null,
        },
      });
    }

    // Asistencia de los últimos 10 días hábiles
    const filas: Prisma.AsistenciaCreateManyInput[] = [];
    for (const asig of seccion.asignaciones) {
      for (const d of dias) {
        const x = rnd();
        const faltar = nivel < 50 ? 0.2 : 0.04;
        filas.push({
          asignacionId: asig.id, inscripcionId: ins.id,
          fecha: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
          estado: x < faltar ? "AUSENTE" : x < faltar + 0.03 ? "TARDE" : x < faltar + 0.05 ? "EXCUSA" : "PRESENTE",
        });
      }
    }
    await prisma.asistencia.createMany({ data: filas, skipDuplicates: true });
  }

  const total = await prisma.alumno.count();
  console.log(`Listo: ${nuevos} alumnos nuevos (${CANTIDAD - nuevos} ya existían). Total en la base: ${total}.`);
  console.log(`Repartidos en ${secciones.length} secciones de ${GRADOS.length} grados, con cuotas, pagos, notas, boletas y asistencia.`);
}

async function pagar(
  tx: Prisma.TransactionClient, inscripcionId: number,
  d: { pagaIns: boolean; meses: number; parcial: number; metodo: (typeof METODOS)[number]; ref?: string }, adminId: number,
) {
  const cargos = await tx.cargo.findMany({ where: { inscripcionId }, orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }] });
  const lineas: { cargoId: number; centavos: number }[] = [];
  const insc = cargos.find((c) => c.concepto === "INSCRIPCION");
  if (d.pagaIns && insc && saldoCentavos(insc) > 0) lineas.push({ cargoId: insc.id, centavos: saldoCentavos(insc) });
  const mens = cargos.filter((c) => c.concepto === "MENSUALIDAD");
  mens.slice(0, d.meses).forEach((c) => {
    if (saldoCentavos(c) > 0) lineas.push({ cargoId: c.id, centavos: saldoCentavos(c) });
  });
  if (d.parcial) {
    const sig = mens[d.meses];
    if (sig && d.parcial < saldoCentavos(sig)) lineas.push({ cargoId: sig.id, centavos: d.parcial });
  }
  if (lineas.length === 0) return;

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
    await tx.cargo.update({ where: { id: c.id }, data: { pagado: deCentavos(pagado), estado: estadoSegunPago(netoCentavos(c), pagado) } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
