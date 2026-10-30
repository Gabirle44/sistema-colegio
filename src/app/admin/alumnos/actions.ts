"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { validarAlumno, type ErroresAlumno } from "@/lib/validaciones/alumno";
import { leerFoto } from "@/lib/validaciones/foto";

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
  const foto = await leerFoto(formData.get("foto"));
  if (!resultado.datos) return { errors: { ...resultado.errors, ...(foto.error ? { foto: foto.error } : {}) } };
  if (foto.error) return { errors: { foto: foto.error } };

  try {
    await prisma.alumno.create({
      data: {
        ...resultado.datos,
        ...(foto.datos ? { foto: { create: { tipo: foto.datos.tipo, datos: foto.datos.bytes } } } : {}),
      },
    });
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
  const foto = await leerFoto(formData.get("foto"));
  if (!resultado.datos) return { errors: { ...resultado.errors, ...(foto.error ? { foto: foto.error } : {}) } };
  if (foto.error) return { errors: { foto: foto.error } };

  // Foto nueva la reemplaza; "quitar" la borra; si no se toca, se conserva
  const cambioFoto = foto.datos
    ? {
        foto: {
          upsert: {
            create: { tipo: foto.datos.tipo, datos: foto.datos.bytes },
            update: { tipo: foto.datos.tipo, datos: foto.datos.bytes },
          },
        },
      }
    : {};

  try {
    await prisma.alumno.update({ where: { id }, data: { ...resultado.datos, ...cambioFoto } });
    if (!foto.datos && formData.get("quitarFoto")) {
      await prisma.alumnoFoto.deleteMany({ where: { alumnoId: id } });
    }
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
