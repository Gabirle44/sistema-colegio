# Manual de instalación — Sistema Colegio Nuevo Horizonte

Guía para dejar el proyecto corriendo en tu computadora desde cero.
Seguí los pasos en orden. Si algo falla, saltá al final, a **Problemas comunes**.

Repositorio: <https://github.com/Gabirle44/sistema-colegio>

---

## 0. Antes de empezar

Necesitás tener instalado:

| Programa | Para qué | Dónde |
|---|---|---|
| **Node.js 22 o superior** | Correr el proyecto | <https://nodejs.org> (versión LTS) |
| **Git** | Bajar el código | <https://git-scm.com/downloads> |
| **Docker Desktop** | Levantar la base de datos | <https://www.docker.com/products/docker-desktop/> |
| **Visual Studio Code** | Editar el código | <https://code.visualstudio.com> |

Para verificar que Node y Git quedaron bien, abrí **PowerShell** y escribí:

```powershell
node -v
git --version
```

Si te responde con números de versión, vas bien. Si dice que no reconoce el comando,
cerrá PowerShell, volvé a abrirlo, y si sigue igual reinstalá el programa.

> **Si no querés instalar Docker:** se puede usar PostgreSQL instalado directamente.
> En ese caso saltate el paso 5 y pedile a Eleazar la cadena de conexión correcta.

---

## ⚠️ 1. Elegí bien dónde va la carpeta

**No pongas el proyecto dentro de OneDrive, Google Drive ni Dropbox.**

Esas carpetas sincronizan archivos a la nube todo el tiempo. El proyecto crea decenas de
miles de archivos pequeños en `node_modules`, y la sincronización los bloquea a medio
escribir. El resultado son errores rarísimos que no tienen nada que ver con el código y
que cuesta días entender.

Usá una ruta simple, sin espacios ni tildes:

```
C:\Users\TU_USUARIO\proyectos\
```

Para crearla:

```powershell
mkdir C:\Users\$env:USERNAME\proyectos
cd C:\Users\$env:USERNAME\proyectos
```

---

## 2. Bajar el código

### Si es la primera vez

```powershell
git clone https://github.com/Gabirle44/sistema-colegio.git
cd sistema-colegio
```

### Si ya tenías el proyecto de antes

Entrá a tu carpeta del proyecto y traé lo último de `main`:

```powershell
git checkout main
git pull origin main
```

Verificá que quedaste en `main` y al día:

```powershell
git branch --show-current
git log --oneline -3
```

El primer comando debe responder `main`. El segundo te muestra los últimos tres cambios;
comparalos con los de GitHub para confirmar que estás al día.

> Si `git checkout main` te dice que tenés cambios sin guardar, guardalos primero con
> `git stash`, hacé el checkout, y recuperalos con `git stash pop`.

---

## 3. Instalar las dependencias

```powershell
npm install
```

Esto hace dos cosas: baja las librerías y **genera el cliente de Prisma**, que es el código
que habla con la base de datos. La generación ocurre sola gracias al script `postinstall`.

Tarda unos minutos la primera vez. Es normal que salgan avisos amarillos (`warn`);
lo que importa es que no salga ningún `error`.

---

## 4. Crear el archivo de configuración

El proyecto necesita un archivo `.env` con las claves y la dirección de la base de datos.
Ese archivo **no viene en el repositorio a propósito**, porque lleva contraseñas. Por eso
hay una plantilla que sí se sube: `.env.example`.

Copiala:

```powershell
copy .env.example .env
```

Abrila para revisarla:

```powershell
notepad .env
```

Si vas a usar Docker, los valores que trae ya sirven tal cual. Solo cambiá el
`SESSION_SECRET` por uno propio, que lo generás con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copiá lo que imprima y pegalo entre las comillas del `SESSION_SECRET`.

> **Importante:** cuando cierres el Bloc de notas, no lo vuelvas a abrir y guardar más
> tarde "por si acaso". Si tenés una ventana vieja abierta y le das Ctrl+S, pisás el
> archivo con contenido viejo.

---

## 5. Levantar la base de datos

Abrí **Docker Desktop** y esperá a que diga *Running*. Después:

```powershell
docker compose up -d
```

Para confirmar que arrancó:

```powershell
docker ps
```

Tenés que ver un contenedor llamado `colegio-db`. Si la lista sale vacía, Docker Desktop
no terminó de arrancar; esperá un minuto y repetí.

---

## 6. Crear las tablas

```powershell
npx prisma migrate dev
```

Esto aplica las migraciones y crea las tablas del sistema: alumnos, inscripciones, cobros,
notas, asistencia y las demás. Sin este paso la aplicación arranca pero revienta apenas
intentás entrar, porque le pide a la base tablas que no existen.

Si te pregunta por un nombre para una migración nueva, **cancelá con Ctrl+C y avisá al
grupo**. Significa que tu `schema.prisma` no coincide con las migraciones, y crear una
migración nueva ahí rompe el proyecto para todos.

---

## 7. Crear los usuarios de prueba

```powershell
npx tsx prisma/seed.ts
```

Esto crea el usuario administrador y el de maestro, con las contraseñas que pusiste en tu
`.env`. Sin este paso no vas a poder entrar, porque no existe ningún usuario.

---

## 8. Arrancar el proyecto

```powershell
npm run dev
```

Abrí <http://localhost:3000> en el navegador.

Entrá con:

- **Administrador:** `admin@colegio.test` y el `ADMIN_PASSWORD` de tu `.env`
- **Maestro:** `maestro@colegio.test` y el `MAESTRO_PASSWORD` de tu `.env`

Para detener el servidor, **Ctrl+C** en la terminal.

---

## Resumen, todo junto

Si ya tenés Node, Git y Docker, esto es todo:

```powershell
cd C:\Users\$env:USERNAME\proyectos
git clone https://github.com/Gabirle44/sistema-colegio.git
cd sistema-colegio
npm install
copy .env.example .env
docker compose up -d
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

---

## Problemas comunes

### `@prisma/client did not initialize yet. Please run "prisma generate"`

El cliente de Prisma no se generó. Normalmente `npm install` lo hace solo; si no pasó:

```powershell
npx prisma generate
```

Después reiniciá el servidor (Ctrl+C y `npm run dev` otra vez).

### `PrismaClientKnownRequestError` al entrar al login

Casi siempre es que **faltan las tablas**: la base existe pero está vacía. Corré:

```powershell
npx prisma migrate dev
```

### `Can't reach database server at localhost:5432`

La base no está levantada. Abrí Docker Desktop, esperá a que diga *Running*, y:

```powershell
docker compose up -d
```

### `Correo o contraseña incorrectos`

No corriste el seed, o las contraseñas de tu `.env` no son las que tiene la base.
Volvé a correr:

```powershell
npx tsx prisma/seed.ts
```

### `Demasiados intentos fallidos`

El sistema bloquea tras 5 intentos fallidos con el mismo correo. El bloqueo dura
**15 minutos** y se quita solo. No es un error, es la protección funcionando.

### Errores raros que aparecen y desaparecen

Revisá si la carpeta está dentro de OneDrive. Si lo está, movela a
`C:\Users\TU_USUARIO\proyectos\` y corré `npm install` de nuevo. Ver el paso 1.

### En un Pull Request sale un check rojo de Vercel

Dice algo como *"Git author ... must have access to the project on Vercel"*.
**No es un error del código.** Es una limitación del plan gratuito de Vercel: solo
despliega commits del dueño de la cuenta. El Pull Request se puede mergear igual.

---

## Si nada de esto funciona

Borrá lo instalado y empezá limpio:

```powershell
rmdir /s /q node_modules
del package-lock.json
npm install
```

Y si sigue, mandá al grupo una captura con **el comando que corriste y el error completo**,
no solo la última línea. Sin eso no se puede saber qué pasó.
