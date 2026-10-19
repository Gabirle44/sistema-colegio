"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function crearCurso(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const gradoIdRaw = formData.get("gradoId") as string;

  if (!nombre || !gradoIdRaw) return;

  const gradoId = parseInt(gradoIdRaw);

  await prisma.curso.create({
    data: {
      nombre: nombre.trim().toUpperCase(),
      gradoId: gradoId,
    },
  });

  revalidatePath("/admin/cursos");
}

export async function eliminarCurso(formData: FormData) {
  const idRaw = formData.get("id") as string;
  if (!idRaw) return;

  const id = parseInt(idRaw);

  await prisma.curso.delete({
    where: { id },
  });

  revalidatePath("/admin/cursos");
}