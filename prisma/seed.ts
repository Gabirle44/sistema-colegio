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

  console.log("Usuarios de prueba listos: admin@colegio.test y maestro@colegio.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
