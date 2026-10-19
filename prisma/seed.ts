import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Administrador de prueba
  await prisma.usuario.upsert({
    where: { email: "admin@colegio.test" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@colegio.test",
      passwordHash: await bcrypt.hash("Admin123!", 10),
      rol: "ADMIN",
    },
  });

  // Maestro de prueba (con su registro en la tabla maestros)
  const usuarioMaestro = await prisma.usuario.upsert({
    where: { email: "maestro@colegio.test" },
    update: {},
    create: {
      nombre: "Maestro Demo",
      email: "maestro@colegio.test",
      passwordHash: await bcrypt.hash("Maestro123!", 10),
      rol: "MAESTRO",
    },
  });

  await prisma.maestro.upsert({
    where: { usuarioId: usuarioMaestro.id },
    update: {},
    create: {
      usuarioId: usuarioMaestro.id,
      nombres: "Maestro",
      apellidos: "Demo",
      salarioMensual: 3500,
    },
  });

  // Datos mínimos para poder probar inscripciones y cobros
  // (se reemplazan cuando el equipo termine los CRUD de ciclos, grados y secciones)
  const ciclo = await prisma.cicloEscolar.upsert({
    where: { anio: 2026 },
    update: {},
    create: { anio: 2026, activo: true },
  });
  const grado = await prisma.grado.upsert({
    where: { nombre: "Primero Básico" },
    update: {},
    create: { nombre: "Primero Básico", orden: 1 },
  });
  const existe = await prisma.seccion.findFirst({
    where: { nombre: "A", gradoId: grado.id, cicloId: ciclo.id },
  });
  if (!existe) {
    await prisma.seccion.create({ data: { nombre: "A", gradoId: grado.id, cicloId: ciclo.id } });
  }
  await prisma.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  // Periodos, cursos y asignación al maestro demo (para probar notas y boletas)
  for (const [i, nombre] of ["Bimestre I", "Bimestre II", "Bimestre III", "Bimestre IV"].entries()) {
    await prisma.periodo.upsert({
      where: { cicloId_numero: { cicloId: ciclo.id, numero: i + 1 } },
      update: {},
      create: { cicloId: ciclo.id, numero: i + 1, nombre },
    });
  }
  const cursos = [];
  for (const nombre of ["Matemática", "Comunicación y Lenguaje", "Ciencias Naturales", "Estudios Sociales", "Inglés"]) {
    cursos.push(
      await prisma.curso.upsert({
        where: { gradoId_nombre: { gradoId: grado.id, nombre } },
        update: {},
        create: { gradoId: grado.id, nombre },
      }),
    );
  }
  const seccionA = await prisma.seccion.findFirstOrThrow({
    where: { nombre: "A", gradoId: grado.id, cicloId: ciclo.id },
  });
  const maestroDemo = await prisma.maestro.findFirstOrThrow({ where: { usuarioId: usuarioMaestro.id } });
  for (const curso of cursos.slice(0, 3)) {
    await prisma.asignacionCurso.upsert({
      where: { cursoId_seccionId: { cursoId: curso.id, seccionId: seccionA.id } },
      update: {},
      create: { maestroId: maestroDemo.id, cursoId: curso.id, seccionId: seccionA.id },
    });
  }

  console.log("Usuarios de prueba listos: admin@colegio.test y maestro@colegio.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
