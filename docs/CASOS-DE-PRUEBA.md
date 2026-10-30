# Casos de prueba (SC-27)

Dos tipos de prueba: **automáticas** (`npm test`, corren también en el CI de cada Pull Request) y **manuales** (se ejecutan en la app desplegada o en local). El campo *Resultado* de las manuales lo llena quien las ejecuta.

## A. Pruebas automáticas (archivo `tests/`)

| ID | Qué verifica | Archivo | Resultado |
| --- | --- | --- | --- |
| A-01 | Planilla: IGSS 4.83 % sobre sueldo y bonificación Q250 sin IGSS | `planilla.test.ts` | Pasa |
| A-02 | Planilla: las horas extra sí afectan el IGSS | `planilla.test.ts` | Pasa |
| A-03 | Planilla: todos los montos son enteros; negativos se tratan como cero | `planilla.test.ts` | Pasa |
| A-04 | Dinero: conversión a centavos sin error de decimales y formato Q1,234.56 | `dinero-fechas.test.ts` | Pasa |
| A-05 | Dinero: se rechazan montos negativos y texto | `dinero-fechas.test.ts` | Pasa |
| A-06 | Fechas: hora de Guatemala UTC-6, mes y cambio de día | `dinero-fechas.test.ts` | Pasa |
| A-07 | Teléfono WhatsApp con código 502; CSV con comillas y comas | `dinero-fechas.test.ts` | Pasa |
| A-08 | Notas: promedio, redondeo a 2 decimales, EN_PROCESO/APROBADO/REPROBADO | `notas.test.ts` | Pasa |
| A-09 | CSV de notas: separador y comillas | `notas.test.ts` | Pasa |

## B. Pruebas manuales

| ID | Rol | Pasos | Resultado esperado | Resultado |
| --- | --- | --- | --- | --- |
| B-01 | Cualquiera | Iniciar sesión con correo y contraseña correctos | Entra al panel de su rol | |
| B-02 | Cualquiera | Iniciar sesión con contraseña incorrecta | Mensaje de error sin decir cuál dato falló | |
| B-03 | Cualquiera | Fallar la contraseña 5 veces con el mismo correo | Cuenta bloqueada 15 minutos, aunque luego se use la contraseña buena | |
| B-04 | Cualquiera | Cerrar sesión y volver atrás con el navegador | Redirige al inicio de sesión | |
| B-05 | MAESTRO | Escribir en la barra la dirección `/admin/cobros` | No permite el acceso | |
| B-06 | ADMIN | Crear un alumno con carné repetido | Rechaza e indica el motivo | |
| B-07 | ADMIN | Inscribir un alumno en una sección | Aparece en la lista de la sección y se generan sus cargos | |
| B-08 | ADMIN | Registrar el pago de una colegiatura | Se emite el recibo y el cargo queda pagado | |
| B-09 | ADMIN | Descargar el recibo en PDF | El PDF abre con serie, número y monto correctos | |
| B-10 | ADMIN | Abrir "Morosos" con una cuota vencida | El alumno aparece con el monto adeudado | |
| B-11 | MAESTRO | Cargar notas de zona y examen | La nota final se calcula sola | |
| B-12 | MAESTRO | Subir notas con un CSV | Se cargan las notas y se avisa de filas con error | |
| B-13 | ADMIN | Generar la boleta de calificaciones de un alumno | PDF con promedios y resultado correctos | |
| B-14 | MAESTRO | Marcar asistencia del día | Queda guardada y se puede ver después | |
| B-15 | ADMIN | Crear dos bloques de horario que choquen en la misma sección | Rechaza e indica el choque | |
| B-16 | ADMIN | Crear la planilla de un maestro | Muestra IGSS, bonificación y líquido | |
| B-17 | MAESTRO | Publicar una tarea | La tarea aparece en la lista del curso | |
| B-18 | MAESTRO | Cambiar su contraseña con la actual equivocada | Rechaza el cambio | |
| B-19 | ADMIN | Consultar la bitácora tras crear un registro | Aparece quién y cuándo lo hizo | |
| B-20 | Cualquiera | Abrir la app desde un teléfono | El diseño se adapta, sin scroll horizontal | |

## Cómo ejecutar

```
npm test            # pruebas automáticas
npm run lint        # estilo
npx tsc --noEmit    # tipos
```
