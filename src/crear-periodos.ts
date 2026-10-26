import { prisma } from "./lib/prisma";

async function main() {
  const ciclo = await prisma.cicloEscolar.findFirst({
    where: { anio: 2026 },
  });

  if (!ciclo) {
    console.log("No se encontró el ciclo 2026.");
    return;
  }

  const existen = await prisma.periodo.count({ where: { cicloId: ciclo.id } });
  if (existen > 0) {
    console.log(`El ciclo 2026 ya tiene ${existen} periodos registrados.`);
    return;
  }

  await prisma.periodo.createMany({
    data: [
      { cicloId: ciclo.id, numero: 1, nombre: "Bloque 1", abierto: true },
      { cicloId: ciclo.id, numero: 2, nombre: "Bloque 2", abierto: true },
      { cicloId: ciclo.id, numero: 3, nombre: "Bloque 3", abierto: true },
      { cicloId: ciclo.id, numero: 4, nombre: "Bloque 4", abierto: true },
    ],
  });

  console.log("¡Se crearon los 4 bloques exitosamente para el ciclo 2026!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());