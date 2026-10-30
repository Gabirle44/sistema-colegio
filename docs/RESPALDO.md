# Respaldo y restauración de la base de datos (SC-30)

## Qué hay ya resuelto por el proveedor

La base de producción está en **Neon**, que conserva el historial de cambios de los últimos días (restauración a un punto en el tiempo). Eso protege contra un error reciente, pero **no** contra perder la cuenta de Neon. Por eso existe además un respaldo propio.

## Sacar un respaldo

Con el archivo `.env` apuntando a la base que se quiere respaldar:

```
npm run respaldo
```

Genera `backups/respaldo-AAAA-MM-DD_HHMM.json` con **todas las tablas** y muestra cuántos registros tiene cada una. No necesita `pg_dump`.

Para respaldar **producción**, usar la cadena directa de Neon (sin `-pooler`) en `DATABASE_URL`, solo durante ese comando, y sin guardarla en ningún archivo que se suba a Git.

## Cada cuánto

Antes de cada presentación o cambio grande de la base (migraciones), y una vez por semana mientras el sistema esté en uso.

## Dónde guardarlo

Fuera del repositorio: una carpeta cifrada o un disco propio. La carpeta `backups/` está en `.gitignore`.

**Advertencia:** el archivo contiene datos reales de alumnos y los hashes de las contraseñas. No subirlo a GitHub, no compartirlo por WhatsApp ni por correo.

## Restaurar

El respaldo es un JSON por tabla. Para recuperar:

1. Levantar una base **vacía** (local con `docker compose up -d`, o una rama nueva de Neon).
2. Crear las tablas: `npx prisma migrate deploy`.
3. Leer el JSON e insertar tabla por tabla con Prisma `createMany`, respetando el orden de las llaves foráneas (primero ciclos, grados, alumnos, maestros; después inscripciones, cargos, recibos, notas).
4. Verificar contando los registros contra el resumen que imprimió el respaldo.

**Nunca restaurar encima de la base de producción sin antes respaldarla.** Un respaldo que nunca se probó restaurando no es una garantía: la restauración debe probarse al menos una vez en la base local.

## Limitación conocida

La restauración automática (script) no está implementada; el procedimiento del punto anterior es manual. Queda como mejora futura.
