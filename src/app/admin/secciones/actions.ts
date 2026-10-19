"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function crearSeccion(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const gradoIdRaw = formData.get("gradoId") as string;
  const cicloIdRaw = formData.get("cicloId") as string;

  if (!nombre || !gradoIdRaw || !cicloIdRaw) return;

  const gradoId = parseInt(gradoIdRaw);
  const cicloId = parseInt(cicloIdRaw);

  await prisma.seccion.create({
    data: {
      nombre: nombre.trim().toUpperCase(),
      gradoId: gradoId,
      cicloId: cicloId,
    },
  });

  revalidatePath("/admin/secciones");
}

export async function eliminarSeccion(formData: FormData) {
  const idRaw = formData.get("id") as string;
  if (!idRaw) return;

  const id = parseInt(idRaw);

  await prisma.seccion.delete({
    where: { id },
  });

  revalidatePath("/admin/secciones");
}