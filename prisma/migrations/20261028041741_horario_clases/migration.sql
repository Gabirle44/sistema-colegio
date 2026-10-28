-- CreateTable
CREATE TABLE "bloques_horario" (
    "id" SERIAL NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,

    CONSTRAINT "bloques_horario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bloques_horario_asignacionId_idx" ON "bloques_horario"("asignacionId");

-- CreateIndex
CREATE INDEX "bloques_horario_diaSemana_idx" ON "bloques_horario"("diaSemana");

-- AddForeignKey
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
