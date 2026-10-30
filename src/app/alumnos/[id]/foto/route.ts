import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

// Sirve la foto del alumno. Esta ruta no está bajo /admin ni /maestro, así que
// revisa la sesión aquí: el administrador ve todas; el maestro solo las de
// alumnos de las secciones donde da clase.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return new Response("No autorizado", { status: 401 });

  const alumnoId = Number((await params).id);
  if (!Number.isInteger(alumnoId)) return new Response("No encontrada", { status: 404 });

  if (sesion.rol === "MAESTRO") {
    const maestro = await prisma.maestro.findUnique({ where: { usuarioId: sesion.userId } });
    if (!maestro || !maestro.activo) return new Response("No autorizado", { status: 403 });
    const imparte = await prisma.inscripcion.findFirst({
      where: { alumnoId, seccion: { asignaciones: { some: { maestroId: maestro.id } } } },
      select: { id: true },
    });
    if (!imparte) return new Response("No autorizado", { status: 403 });
  }

  const foto = await prisma.alumnoFoto.findUnique({ where: { alumnoId } });
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(foto.datos), {
    headers: {
      "Content-Type": foto.tipo,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
