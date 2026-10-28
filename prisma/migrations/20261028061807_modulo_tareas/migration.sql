-- CreateTable
CREATE TABLE "tareas" (
    "id" SERIAL NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "puntos" DECIMAL(5,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas_tareas" (
    "id" SERIAL NOT NULL,
    "tareaId" INTEGER NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3),
    "nota" DECIMAL(5,2),

    CONSTRAINT "entregas_tareas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tareas_asignacionId_idx" ON "tareas"("asignacionId");

-- CreateIndex
CREATE INDEX "entregas_tareas_tareaId_idx" ON "entregas_tareas"("tareaId");

-- CreateIndex
CREATE INDEX "entregas_tareas_inscripcionId_idx" ON "entregas_tareas"("inscripcionId");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_tareas_tareaId_inscripcionId_key" ON "entregas_tareas"("tareaId", "inscripcionId");

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_tareas" ADD CONSTRAINT "entregas_tareas_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_tareas" ADD CONSTRAINT "entregas_tareas_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
