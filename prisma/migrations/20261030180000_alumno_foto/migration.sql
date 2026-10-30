-- SC-38: foto del alumno en tabla aparte (máximo 200 KB, validado en el servidor)
CREATE TABLE "alumno_fotos" (
    "alumnoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumno_fotos_pkey" PRIMARY KEY ("alumnoId")
);

ALTER TABLE "alumno_fotos" ADD CONSTRAINT "alumno_fotos_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
