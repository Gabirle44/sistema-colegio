-- CreateTable
CREATE TABLE "actividades" (
    "id" SERIAL NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "puntos" DECIMAL(5,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_actividad" (
    "id" SERIAL NOT NULL,
    "actividadId" INTEGER NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "puntos" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "notas_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actividades_asignacionId_periodoId_idx" ON "actividades"("asignacionId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "notas_actividad_actividadId_inscripcionId_key" ON "notas_actividad"("actividadId", "inscripcionId");

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_actividad" ADD CONSTRAINT "notas_actividad_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_actividad" ADD CONSTRAINT "notas_actividad_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
