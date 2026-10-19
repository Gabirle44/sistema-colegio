-- CreateTable
CREATE TABLE "intentos_login" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "ultimoIntento" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intentos_login_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intentos_login_clave_key" ON "intentos_login"("clave");

-- CreateIndex
CREATE INDEX "intentos_login_ultimoIntento_idx" ON "intentos_login"("ultimoIntento");
