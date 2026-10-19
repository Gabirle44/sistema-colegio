-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('PRESENTE', 'AUSENTE', 'TARDE', 'EXCUSA');

-- CreateTable
CREATE TABLE "asistencias" (
    "id" SERIAL NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL,
    "observacion" TEXT,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asistencias_asignacionId_fecha_idx" ON "asistencias"("asignacionId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_asignacionId_inscripcionId_fecha_key" ON "asistencias"("asignacionId", "inscripcionId", "fecha");

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
