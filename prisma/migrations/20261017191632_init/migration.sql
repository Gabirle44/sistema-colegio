-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'MAESTRO');

-- CreateEnum
CREATE TYPE "Concepto" AS ENUM ('INSCRIPCION', 'MENSUALIDAD', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCargo" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'CHEQUE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maestros" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT,
    "salarioMensual" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "maestros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclos_escolares" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ciclos_escolares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grados" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "grados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "gradoId" INTEGER NOT NULL,
    "cicloId" INTEGER NOT NULL,

    CONSTRAINT "secciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "gradoId" INTEGER NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_curso" (
    "id" SERIAL NOT NULL,
    "maestroId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "seccionId" INTEGER NOT NULL,

    CONSTRAINT "asignaciones_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos" (
    "id" SERIAL NOT NULL,
    "cicloId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "abierto" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumnos" (
    "id" SERIAL NOT NULL,
    "carnet" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "encargadoNombre" TEXT NOT NULL,
    "encargadoTelefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" SERIAL NOT NULL,
    "alumnoId" INTEGER NOT NULL,
    "seccionId" INTEGER NOT NULL,
    "cicloId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montoInscripcion" DECIMAL(10,2) NOT NULL,
    "montoMensualidad" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" SERIAL NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "concepto" "Concepto" NOT NULL,
    "mes" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCargo" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "cargoId" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" "MetodoPago" NOT NULL,
    "registradoPorId" INTEGER NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recibos" (
    "id" SERIAL NOT NULL,
    "numero" SERIAL NOT NULL,
    "pagoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emitidoPorId" INTEGER NOT NULL,

    CONSTRAINT "recibos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_maestros" (
    "id" SERIAL NOT NULL,
    "maestroId" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "registradoPorId" INTEGER NOT NULL,

    CONSTRAINT "pagos_maestros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" SERIAL NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "valor" DECIMAL(5,2) NOT NULL,
    "registradaPorId" INTEGER NOT NULL,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "maestros_usuarioId_key" ON "maestros"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ciclos_escolares_anio_key" ON "ciclos_escolares"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "grados_nombre_key" ON "grados"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "secciones_gradoId_cicloId_nombre_key" ON "secciones"("gradoId", "cicloId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_gradoId_nombre_key" ON "cursos"("gradoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_curso_cursoId_seccionId_key" ON "asignaciones_curso"("cursoId", "seccionId");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_cicloId_numero_key" ON "periodos"("cicloId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_carnet_key" ON "alumnos"("carnet");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_alumnoId_cicloId_key" ON "inscripciones"("alumnoId", "cicloId");

-- CreateIndex
CREATE INDEX "cargos_inscripcionId_estado_idx" ON "cargos"("inscripcionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "recibos_numero_key" ON "recibos"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "recibos_pagoId_key" ON "recibos"("pagoId");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_maestros_maestroId_mes_anio_key" ON "pagos_maestros"("maestroId", "mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "notas_inscripcionId_cursoId_periodoId_key" ON "notas"("inscripcionId", "cursoId", "periodoId");

-- AddForeignKey
ALTER TABLE "maestros" ADD CONSTRAINT "maestros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "grados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos_escolares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "grados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_curso" ADD CONSTRAINT "asignaciones_curso_maestroId_fkey" FOREIGN KEY ("maestroId") REFERENCES "maestros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_curso" ADD CONSTRAINT "asignaciones_curso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_curso" ADD CONSTRAINT "asignaciones_curso_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "secciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos_escolares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "secciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos_escolares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pagos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_emitidoPorId_fkey" FOREIGN KEY ("emitidoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_maestros" ADD CONSTRAINT "pagos_maestros_maestroId_fkey" FOREIGN KEY ("maestroId") REFERENCES "maestros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_maestros" ADD CONSTRAINT "pagos_maestros_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "maestros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
