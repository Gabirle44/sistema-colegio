# Justificación técnica de la arquitectura (SC-24)

El enunciado del curso sugiere Laravel, Django o ASP.NET para el backend y permite "otra tecnología previamente justificada". Este documento es esa justificación.

## Decisión

El sistema usa **Next.js 16 (App Router) con TypeScript** como aplicación única: la interfaz (React 19) y el backend (Server Actions y rutas) viven en el mismo proyecto. La base de datos es **PostgreSQL** (Neon) y se accede con **Prisma 6**.

## Por qué no Laravel, Django o ASP.NET

| Criterio | Next.js + Prisma (lo elegido) | Backend tradicional separado |
| --- | --- | --- |
| Lenguaje | TypeScript en todo el proyecto. Un solo lenguaje para los 5 integrantes. | PHP, Python o C# más JavaScript para el frontend: dos lenguajes y dos proyectos. |
| Tipado de extremo a extremo | El esquema de Prisma genera los tipos; un cambio en la base rompe la compilación donde corresponde. | Hay que mantener a mano el contrato entre API y frontend. |
| Despliegue | Un solo despliegue en Vercel desde GitHub, con preview por rama. | Dos despliegues (API y web) y configurar CORS. |
| Curva de aprendizaje | El equipo ya conocía React; no hubo que aprender un framework nuevo en un semestre. | Habría consumido tiempo del proyecto. |
| Seguridad | Sesión en cookie HttpOnly firmada (JWT con `jose`), contraseñas con bcrypt, validación en el servidor. | Equivalente. Todos los frameworks lo permiten. |

La decisión de fondo: **cumple los mismos elementos que pide el enunciado** (autenticación, roles, CRUD, validaciones, API, persistencia relacional, seguridad, despliegue) con menos piezas que coordinar entre cinco personas.

## Cómo se cubre cada elemento técnico

| Elemento del enunciado | Dónde está |
| --- | --- |
| Autenticación y roles | `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts`; roles ADMIN y MAESTRO |
| CRUD | Módulos de alumnos, maestros, grados, secciones, cobros, tareas (`src/app/admin`, `src/app/maestro`) |
| Validaciones | En el servidor, dentro de cada Server Action (`src/lib/*/actions.ts`, `src/lib/validaciones`) |
| Peticiones asíncronas (AJAX/Fetch) | Server Actions con `useActionState` y rutas de descarga de PDF |
| API / REST | Rutas de PDF y exportaciones bajo `src/app/**/route.ts` |
| Búsqueda y paginación | Listados de alumnos, cobros y bitácora |
| Seguridad | bcrypt, bloqueo tras 5 intentos fallidos por 15 minutos (`src/lib/login/intentos.ts`), cookie firmada, bitácora de auditoría |
| Base de datos relacional | PostgreSQL, 25 modelos, 10 migraciones versionadas. Ver `docs/diagrama-er.md` |
| Pruebas | `tests/` (`npm test`), 19 pruebas de la lógica crítica: dinero, fechas de Guatemala, notas, planilla e IGSS |
| Git | Rama por funcionalidad y Pull Request con revisión |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) y despliegue continuo en Vercel |
| Despliegue | https://sistema-colegio-eight.vercel.app |

## Decisiones de diseño que vale la pena explicar

1. **El dinero se guarda en centavos enteros.** Evita errores de redondeo de punto flotante en cobros y planilla.
2. **Hora de Guatemala (UTC-6) centralizada** en `src/lib/cobros/utils.ts`, porque el servidor de Vercel corre en UTC.
3. **Migraciones con `prisma migrate`**, no cambios manuales a la base: cualquier compañero reconstruye la misma base con un comando.
4. **Neon con URL pooled y URL directa**: la app usa la pooled; las migraciones, la directa.

## Limitaciones conocidas (honestas)

- No hay facturación electrónica FEL; el sistema emite comprobantes internos (fuera de alcance, ver PRD).
- Las tasas de la planilla (IGSS 4.83 % y bonificación de Q250) están codificadas según la ley vigente al desarrollar; si cambian, hay que actualizar `src/lib/maestros/planilla.ts`.
- No hay rol de alumno ni de encargado.
