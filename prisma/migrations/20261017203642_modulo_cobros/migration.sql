/*
  Warnings:

  - You are about to drop the column `pagoId` on the `recibos` table. All the data in the column will be lost.
  - You are about to drop the `pagos` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[recargoDeId]` on the table `cargos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `descripcion` to the `cargos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inscripcionId` to the `recibos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metodo` to the `recibos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `recibos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoRecibo" AS ENUM ('VIGENTE', 'ANULADO');

-- AlterEnum
ALTER TYPE "Concepto" ADD VALUE 'RECARGO';

-- AlterEnum
ALTER TYPE "EstadoCargo" ADD VALUE 'ANULADO';

-- DropForeignKey
ALTER TABLE "pagos" DROP CONSTRAINT "pagos_cargoId_fkey";

-- DropForeignKey
ALTER TABLE "pagos" DROP CONSTRAINT "pagos_registradoPorId_fkey";

-- DropForeignKey
ALTER TABLE "recibos" DROP CONSTRAINT "recibos_pagoId_fkey";

-- DropIndex
DROP INDEX "recibos_pagoId_key";

-- AlterTable
ALTER TABLE "cargos" ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "descripcion" TEXT NOT NULL,
ADD COLUMN     "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pagado" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "recargoDeId" INTEGER;

-- AlterTable
ALTER TABLE "inscripciones" ADD COLUMN     "descuentoInscripcion" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "descuentoMensualidad" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "motivoDescuento" TEXT;

-- AlterTable
ALTER TABLE "recibos" DROP COLUMN "pagoId",
ADD COLUMN     "anuladoEn" TIMESTAMP(3),
ADD COLUMN     "anuladoPorId" INTEGER,
ADD COLUMN     "estado" "EstadoRecibo" NOT NULL DEFAULT 'VIGENTE',
ADD COLUMN     "inscripcionId" INTEGER NOT NULL,
ADD COLUMN     "metodo" "MetodoPago" NOT NULL,
ADD COLUMN     "motivoAnulacion" TEXT,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "serie" TEXT NOT NULL DEFAULT 'A',
ADD COLUMN     "total" DECIMAL(10,2) NOT NULL;

-- DropTable
DROP TABLE "pagos";

-- CreateTable
CREATE TABLE "recibo_detalles" (
    "id" SERIAL NOT NULL,
    "reciboId" INTEGER NOT NULL,
    "cargoId" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "recibo_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombreColegio" TEXT NOT NULL DEFAULT 'Colegio Nuevo Horizonte',
    "direccion" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "serieRecibo" TEXT NOT NULL DEFAULT 'A',
    "cantidadMensualidades" INTEGER NOT NULL DEFAULT 10,
    "mesInicio" INTEGER NOT NULL DEFAULT 1,
    "diaVencimiento" INTEGER NOT NULL DEFAULT 5,
    "diasGracia" INTEGER NOT NULL DEFAULT 0,
    "recargoMora" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" INTEGER,
    "detalle" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recibo_detalles_reciboId_idx" ON "recibo_detalles"("reciboId");

-- CreateIndex
CREATE INDEX "recibo_detalles_cargoId_idx" ON "recibo_detalles"("cargoId");

-- CreateIndex
CREATE INDEX "bitacora_creadoEn_idx" ON "bitacora"("creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_recargoDeId_key" ON "cargos"("recargoDeId");

-- CreateIndex
CREATE INDEX "cargos_fechaVencimiento_idx" ON "cargos"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "recibos_fecha_idx" ON "recibos"("fecha");

-- CreateIndex
CREATE INDEX "recibos_inscripcionId_idx" ON "recibos"("inscripcionId");

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_recargoDeId_fkey" FOREIGN KEY ("recargoDeId") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibo_detalles" ADD CONSTRAINT "recibo_detalles_reciboId_fkey" FOREIGN KEY ("reciboId") REFERENCES "recibos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibo_detalles" ADD CONSTRAINT "recibo_detalles_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
