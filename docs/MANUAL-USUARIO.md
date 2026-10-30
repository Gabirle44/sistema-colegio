# Manual de usuario — Sistema Colegio Nuevo Horizonte (SC-25)

Dirección del sistema: https://sistema-colegio-eight.vercel.app

Hay dos tipos de usuario: **Administrador** (secretaría y dirección) y **Maestro**.

> Para entregar con capturas: en cada sección hay una línea **[Captura]** que indica qué pantalla pegar.

## 1. Entrar y salir

1. Abrir la dirección del sistema.
2. Escribir el correo y la contraseña y pulsar **Ingresar**.
3. Para salir, usar el botón **Salir**.

Si se falla la contraseña **5 veces seguidas** con el mismo correo, la cuenta se bloquea **15 minutos**. Es una medida de seguridad.

**[Captura: pantalla de inicio de sesión]**

## 2. Administrador

El menú de la izquierda se divide en grupos.

### 2.1 Alumnos
- **Alumnos → + Nuevo alumno:** llenar carnet, nombres, apellidos y datos del encargado. Se puede subir una **foto** (JPG o PNG de hasta 200 KB).
- **Buscar:** escribir nombre o carnet en la barra de búsqueda.
- **Editar:** cambia datos y foto. **Desactivar** retira al alumno sin borrar su historial.

**[Captura: lista de alumnos]  [Captura: formulario de alumno]**

### 2.2 Académico y horarios
- **Académico:** ciclo escolar, grados, secciones, cursos y periodos.
- **Horarios:** asignar bloques de clase por sección y maestro. El sistema avisa si hay choque de horario.
- **Promoción:** pasar alumnos al siguiente ciclo.

**[Captura: estructura académica]**

### 2.3 Caja
- **Cobros:** abrir un alumno, ver sus cargos y registrar el pago. Se emite un **recibo** que se descarga en PDF.
- **Recibos:** lista y búsqueda de recibos emitidos.
- **Morosos:** alumnos con cuotas vencidas y su saldo; desde aquí se puede contactar al encargado por WhatsApp.
- **Cierre de caja** y **Reportes:** resumen del día y exportación.

**[Captura: cobro de colegiatura]  [Captura: recibo en PDF]  [Captura: morosos]**

### 2.4 Personal
- **Maestros:** crear maestros y asignarles cursos y secciones.
- **Administradores:** crear, desactivar o restablecer la contraseña de otros administradores. No se puede desactivar al único administrador activo.
- **Pagos a maestros:** planilla con sueldo, bonificación incentivo, IGSS y líquido a pagar.

**[Captura: planilla de un maestro]**

### 2.5 Calificaciones
- **Notas:** ver y descargar el cuadro de notas por curso en PDF o CSV.
- **Asistencia, Tareas:** consulta de lo que registran los maestros.
- **Boletas:** boleta de calificaciones por alumno o por sección, en PDF.

**[Captura: boleta en PDF]**

### 2.6 Sistema
- **Configuración:** valores generales del colegio.
- **Bitácora:** registro de quién hizo qué y cuándo.

## 3. Maestro

Al entrar se ve el panel con sus cursos.

- **Notas:** abrir un curso, escribir zona y examen por periodo; la nota final se calcula sola. También se puede cargar un archivo CSV.
- **Asistencia:** marcar presente, ausente o excusa por día.
- **Tareas:** publicar tareas y registrar entregas.
- **Horario:** ver su horario semanal.
- **Ficha del alumno:** ver foto, datos de contacto, notas y asistencia de sus alumnos, y contactar al encargado.
- **Mi perfil:** cambiar su contraseña (mínimo 8 caracteres, distinta de la actual).

**[Captura: panel del maestro]  [Captura: captura de notas]  [Captura: ficha del alumno]**

## 4. Uso en celular

Las listas principales se muestran como tarjetas en pantallas pequeñas, sin desplazamiento horizontal.

## 5. Problemas frecuentes

| Problema | Qué hacer |
| --- | --- |
| "Correo o contraseña incorrectos" al entrar | Revisar mayúsculas y espacios; tras 5 fallos esperar 15 minutos |
| No veo un alumno | Revisar si está desactivado o sin inscripción en el ciclo activo |
| El PDF no descarga | Permitir ventanas emergentes para el sitio |
| Un maestro no ve un curso | El administrador debe asignárselo en **Maestros** |
