"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function crearGrado(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const orden = parseInt(formData.get("orden") as string) || 0;

  if (!nombre || nombre.trim() === "") {
    return;
  }

  await prisma.grado.create({
    data: {
      nombre: nombre.trim(),
      orden: orden,
    },
  });

  revalidatePath("/admin/grados");
}

export async function eliminarGrado(formData: FormData) {
  const id = parseInt(formData.get("id") as string);

  if (!id) return;

  await prisma.grado.delete({
    where: { id },
  });

  revalidatePath("/admin/grados");
}