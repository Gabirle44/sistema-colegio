# Sistema de Gestión Académica y Escolar

Plataforma web para la gestión integral de centros educativos. Permite administrar ciclos escolares, grados, cursos, asignación de maestros, carga manual y masiva de calificaciones con cálculo automático de zona/examen, y generación de boletas en PDF.

## Tecnologías

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4
- **Base de Datos:** PostgreSQL
- **ORM:** Prisma 6

## Requisitos

Asegúrate de tener instalado lo siguiente en tu equipo:

- **Node.js:** v22 o superior
- **Git**
- **Docker Desktop** (para la base de datos local)

## Instalación

Sigue este bloque de comandos de principio a fin para clonar, configurar y ejecutar el proyecto localmente:

```bash
# 1. Clonar el repositorio
git clone [https://github.com/Gabirle44/sistema-colegio.git](https://github.com/Gabirle44/sistema-colegio.git)
cd sistema-colegio

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env

# 4. Levantar la base de datos PostgreSQL con Docker
docker compose up -d

# 5. Ejecutar migraciones de base de datos y cargar datos iniciales (Seed)
npx prisma migrate dev
npx prisma db seed

# 6. Inicializar bloques del ciclo activo
npx tsx src/crear-periodos.ts

# 7. Iniciar el servidor de desarrollo
npm run dev