"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { validarAlumno, type ErroresAlumno } from "@/lib/validaciones/alumno";

export type AlumnoFormState = { errors?: ErroresAlumno; message?: string } | undefined;

// Convierte el error de unicidad de Prisma (P2002) en un mensaje para el campo correcto
function errorDuplicado(e: unknown): ErroresAlumno | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return null;
  const target = String((e.meta as { target?: unknown } | undefined)?.target ?? "");
  if (target.includes("cui")) return { cui: "Ese CUI ya está registrado" };
  return { carnet: "Ese carnet ya está registrado" };
}

export async function crearAlumno(
  _prev: AlumnoFormState,
  formData: FormData,
): Promise<AlumnoFormState> {
  await requireAdmin();
  const resultado = validarAlumno(formData);
  if (!resultado.datos) return { errors: resultado.errors };

  try {
    await prisma.alumno.create({ data: resultado.datos });
  } catch (e) {
    const duplicado = errorDuplicado(e);
    if (duplicado) return { errors: duplicado };
    throw e;
  }

  revalidatePath("/admin/alumnos");
  redirect("/admin/alumnos");
}

export async function actualizarAlumno(
  id: number,
  _prev: AlumnoFormState,
  formData: FormData,
): Promise<AlumnoFormState> {
  await requireAdmin();
  const resultado = validarAlumno(formData);
  if (!resultado.datos) return { errors: resultado.errors };

  try {
    await prisma.alumno.update({ where: { id }, data: resultado.datos });
  } catch (e) {
    const duplicado = errorDuplicado(e);
    if (duplicado) return { errors: duplicado };
    throw e;
  }

  revalidatePath("/admin/alumnos");
  redirect("/admin/alumnos");
}

export async function cambiarEstadoAlumno(id: number, activo: boolean) {
  await requireAdmin();
  await prisma.alumno.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/alumnos");
}
