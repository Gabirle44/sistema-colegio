import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/lib/notas/acceso";
import FormConAviso from "@/components/FormConAviso";
import { inputCls, btnPrimario, tarjeta } from "@/lib/ui";
import { cambiarPasswordMaestroAction } from "./actions";

export default async function MaestroPerfilPage() {
  const actor = await requireActor();
  if (actor.rol !== "MAESTRO" || !actor.maestroId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        Esta sección es exclusiva para maestros.
      </div>
    );
  }

  const [usuario, maestro, ciclo] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: actor.usuarioId } }),
    prisma.maestro.findUnique({ where: { id: actor.maestroId } }),
    prisma.cicloEscolar.findFirst({ where: { activo: true } }),
  ]);

  const asignaciones = ciclo
    ? await prisma.asignacionCurso.findMany({
        where: { maestroId: actor.maestroId, seccion: { cicloId: ciclo.id } },
        include: {
          curso: true,
          seccion: { include: { grado: true } },
        },
        orderBy: [
          { seccion: { grado: { orden: "asc" } } },
          { seccion: { nombre: "asc" } },
          { curso: { nombre: "asc" } },
        ],
      })
    : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Perfil</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta tus datos de docente y gestiona la seguridad de tu cuenta.
          </p>
        </div>

        <Link
          href="/maestro"
          className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-xs transition"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Regresar a mis cursos</span>
        </Link>
      </div>

      {/* 1. Datos del maestro en modo lectura */}
      <div className={`${tarjeta} space-y-5`}>
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Información del Docente</h2>
          <p className="text-xs text-slate-500">Datos personales registrados en el sistema escolar (solo lectura).</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Nombre completo</span>
            <p className="text-sm font-semibold text-slate-800">
              {maestro ? `${maestro.nombres} ${maestro.apellidos}` : usuario?.nombre}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Correo de acceso</span>
            <p className="text-sm font-semibold text-slate-800">{usuario?.email}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Rol en el sistema</span>
            <p className="text-sm font-semibold text-slate-800">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Maestro / Docente
              </span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Ciclo Escolar Activo</span>
            <p className="text-sm font-semibold text-slate-800">
              {ciclo ? `Ciclo ${ciclo.anio}` : "Sin ciclo activo"}
            </p>
          </div>
        </div>

        {/* Cursos Asignados */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Cursos asignados ({asignaciones.length})
          </span>

          {asignaciones.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No tienes cursos asignados en este ciclo escolar.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {asignaciones.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-900">{a.curso.nombre}</span>
                  <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-600 border border-slate-200/70">
                    {a.seccion.grado.nombre} &quot;{a.seccion.nombre}&quot;
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Formulario de cambio de contraseña */}
      <div className={`${tarjeta} space-y-4`}>
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Seguridad: Cambiar Contraseña</h2>
          <p className="text-xs text-slate-500">
            Ingresa tu contraseña actual y define una nueva. Por seguridad, tu sesión se cerrará automáticamente para que inicies con la nueva clave.
          </p>
        </div>

        <FormConAviso
          action={cambiarPasswordMaestroAction}
          etiqueta="Actualizar mi contraseña"
          etiquetaCargando="Verificando y actualizando..."
          botonClase={`${btnPrimario} mt-4`}
          limpiarSiOk={true}
        >
          <div className="space-y-4 max-w-lg">
            {/* Contraseña Actual */}
            <div className="space-y-1.5">
              <label htmlFor="passwordActual" className="text-xs font-medium text-slate-700">
                Contraseña actual <span className="text-red-500">*</span>
              </label>
              <input
                id="passwordActual"
                name="passwordActual"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña actual"
                className={inputCls}
              />
              <p className="text-[11px] text-slate-500">
                Requerida para confirmar que eres el dueño legítimo de esta cuenta.
              </p>
            </div>

            {/* Nueva Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="passwordNueva" className="text-xs font-medium text-slate-700">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <input
                id="passwordNueva"
                name="passwordNueva"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className={inputCls}
              />
              <p className="text-[11px] text-slate-500">
                Debe tener al menos 8 caracteres y ser distinta a la actual.
              </p>
            </div>

            {/* Confirmación */}
            <div className="space-y-1.5">
              <label htmlFor="passwordConfirmacion" className="text-xs font-medium text-slate-700">
                Confirmar nueva contraseña <span className="text-red-500">*</span>
              </label>
              <input
                id="passwordConfirmacion"
                name="passwordConfirmacion"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repite la nueva contraseña"
                className={inputCls}
              />
            </div>
          </div>
        </FormConAviso>
      </div>
    </div>
  );
}
