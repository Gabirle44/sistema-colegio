# UNIVERSIDAD MARIANO GÁLVEZ DE GUATEMALA
## Facultad de Ingeniería en Sistemas de Información
## Curso: Análisis de Sistemas / Proyecto de Desarrollo

---

**Nombre del Proyecto:** Sistema Colegio Nuevo Horizonte  
**Integrantes:** Bryan, Fernanda, Isela  
**Fecha:** 31 Octubre 2026  

---

# Documento de Requerimientos del Producto (PRD)

## 1. Nombre del proyecto
Sistema Colegio Nuevo Horizonte

## 2. Descripción del negocio
El Colegio Nuevo Horizonte es un centro educativo de nivel básico y diversificado que atiende a unos 300 estudiantes. Actualmente, el colegio gestiona casi todos sus procesos administrativos y académicos a mano o apoyándose en hojas de cálculo (Excel). Esto abarca desde las inscripciones y el control de asistencia hasta la asignación de cursos, la carga de notas y los cobros de colegiaturas. Al no contar con un sistema centralizado, la información suele duplicarse, la entrega de reportes se retrasa y existe el riesgo de cometer errores en los registros académicos y financieros.

## 3. Problema
Trabajar con hojas de cálculo y registros en papel genera varios inconvenientes en la operación diaria del colegio:
- Se pierde mucho tiempo calculando manualmente las zonas y las notas de exámenes finales.
- Es difícil llevar un control exacto de qué alumnos están al día o atrasados con sus colegiaturas.
- No hay forma de generar boletas de calificaciones o reportes consolidados al instante.
- Existe el riesgo constante de modificar o borrar información importante sin querer.

## 4. Objetivo
Desarrollar e implementar una plataforma web centralizada para el ciclo escolar 2026 que automatice las inscripciones, la carga de notas, el registro de asistencia y la generación de boletas de calificaciones en PDF de manera rápida y segura.

## 5. Alcance
Para esta versión del proyecto se entregarán los siguientes módulos funcionando:
- **Acceso y usuarios:** Inicio de sesión según el rol asignado.
- **Estructura académica:** Configuración del año escolar, grados, secciones y bloques/bimestres.
- **Alumnos e inscripciones:** Registro de estudiantes e inscripción al ciclo escolar activo.
- **Maestros:** Creación de docentes y asignación de sus respectivos cursos y grados.
- **Notas:** Carga manual o masiva de zonas y exámenes con cálculo automático del promedio.
- **Boletas de calificaciones:** Generación automática de boletas por alumno en PDF.
- **Asistencia:** Marcado diario de asistencia por parte de cada maestro.
- **Cobros y pagos:** Registro de pagos de inscripciones y colegiaturas.
- **Planilla:** Control básico de pagos e incentivos a los profesores.
- **Reportes:** Visualización y descarga de listados académicos y de estado de cuenta.

## 6. Fuera de alcance
Para evitar sobrecargar esta primera entrega, dejamos fuera los siguientes puntos:
- **Facturación Electrónica (FEL / DTE):** No se conectará con la SAT ni con certificadores de facturas; la gestión se manejará con comprobantes internos (se contempla para una fase posterior en SC-42).
- **Portal para padres o alumnos:** El acceso estará enfocado únicamente en el personal administrativo y docente.
- **Aplicación móvil:** El sistema funcionará 100% desde la web.
- **Generador automático de horarios:** La asignación de horarios de clase se hará de forma manual.

## 7. Usuarios
El sistema tendrá dos roles bien definidos:
- **Administrador (`ADMIN`):** Tiene acceso completo. Se encarga de abrir ciclos escolares, crear grados, inscribir alumnos, registrar pagos, manejar planillas, consultar bitácoras de auditoría y ver reportes generales.
- **Maestro (`MAESTRO`):** Tiene un acceso enfocado solo en sus clases. Puede ingresar la asistencia diaria, cargar las notas de sus alumnos y revisar el consolidado de sus asignaturas.

## 8. Requerimientos funcionales
- **RF-01:** El sistema permite iniciar y cerrar sesión de forma segura para usuarios `ADMIN` y `MAESTRO`.
- **RF-02:** El sistema permite configurar y abrir el ciclo escolar, definiendo los grados, secciones y bloques correspondientes.
- **RF-03:** El sistema permite inscribir y editar los datos de los alumnos en su grado y sección actual.
- **RF-04:** El sistema permite registrar maestros y asignarles los cursos que impartirán en el ciclo.
- **RF-05:** El sistema permite a los docentes ingresar notas de zona y examen, calculando la nota final automáticamente.
- **RF-06:** El sistema permite generar y descargar en PDF la boleta oficial de calificaciones de cada estudiante.
- **RF-07:** El sistema permite a los maestros llevar el control de asistencia diaria (presente, ausente o excusa).
- **RF-08:** El sistema permite registrar las colegiaturas y pagos de inscripción recibidos, emitiendo un comprobante interno.
- **RF-09:** El sistema permite llevar un control sencillo de los pagos realizados a los maestros.
- **RF-10:** El sistema permite consultar y exportar reportes de estado de cuenta, solvencia y notas por grado.

## 9. Requerimientos no funcionales
- **RNF-01 (Diseño responsivo):** La pantalla debe verse y adaptarse bien tanto en computadoras como en tablets y teléfonos celulares.
- **RNF-02 (Seguridad de contraseñas):** Las claves se guardan encriptadas en la base de datos usando `bcrypt`.
- **RNF-03 (Bloqueo por seguridad):** Si alguien ingresa mal su contraseña 5 veces seguidas, el sistema bloquea temporalmente el acceso.
- **RNF-04 (Bitácora de actividades):** El sistema guarda un registro (`AuditLog`) de las acciones principales que realiza cada usuario para saber quién creó o modificó información.
- **RNF-05 (Precisión en dinero):** Todos los montos se manejan en centavos (números enteros) para evitar fallos de redondeo en los cobros.

## 10. Criterios de aceptación
- **CA-01:** Todos los módulos del RF-01 al RF-10 están desarrollados, guardan la información correctamente en la base de datos y no muestran errores en pantalla.
- **CA-02:** Los accesos funcionan según el rol: un maestro no puede ingresar a la parte de cobros ni a la configuración del sistema.
- **CA-03:** Las boletas en PDF se descargan bien y muestran el cálculo correcto de la zona y el examen.
- **CA-04:** Se verifica que las contraseñas en la base de datos no sean visibles en texto plano y que el login se bloquee al 5.º intento fallido.
- **CA-05:** El PRD está ordenado, incluye la carátula oficial de la UMG y cumple con los 10 puntos solicitados en la guía del curso.