-- DropForeignKey
ALTER TABLE "notas" DROP CONSTRAINT "notas_registradaPorId_fkey";

-- AlterTable
ALTER TABLE "configuracion" ADD COLUMN     "bloquearBoletaMora" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notaMinima" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "zonaMax" INTEGER NOT NULL DEFAULT 70;

-- AlterTable
ALTER TABLE "notas" ADD COLUMN     "examen" DECIMAL(5,2),
ADD COLUMN     "observacion" TEXT,
ADD COLUMN     "zona" DECIMAL(5,2),
ALTER COLUMN "registradaPorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "boletas_periodo" (
    "id" SERIAL NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "inasistencias" INTEGER NOT NULL DEFAULT 0,
    "conducta" TEXT,
    "comentario" TEXT,

    CONSTRAINT "boletas_periodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boletas_periodo_inscripcionId_periodoId_key" ON "boletas_periodo"("inscripcionId", "periodoId");

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "maestros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas_periodo" ADD CONSTRAINT "boletas_periodo_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas_periodo" ADD CONSTRAINT "boletas_periodo_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
