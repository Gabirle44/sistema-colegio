/*
  Warnings:

  - A unique constraint covering the columns `[cui]` on the table `alumnos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "alumnos" ADD COLUMN     "cui" TEXT,
ADD COLUMN     "encargadoCorreo" TEXT,
ADD COLUMN     "telefono" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_cui_key" ON "alumnos"("cui");
