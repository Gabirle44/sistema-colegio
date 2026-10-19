"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function crearCiclo(formData: FormData) {
  const anioRaw = formData.get("anio") as string;
  if (!anioRaw) return;

  const anio = parseInt(anioRaw);

  await prisma.cicloEscolar.create({
    data: {
      anio: anio,
      activo: true,
    },
  });

  revalidatePath("/admin/periodos");
  revalidatePath("/admin/secciones");
}