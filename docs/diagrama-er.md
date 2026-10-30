# Diagrama Entidad-Relacion

Sistema Colegio Nuevo Horizonte. **25 tablas y 6 enumeraciones.**

Este documento se genera a partir de `prisma/schema.prisma`, que es la definicion
real de la base de datos. Si el esquema cambia, hay que regenerarlo para que no mienta.

GitHub dibuja estos diagramas solo: se ven aqui mismo, sin descargar nada.

---

## Vista general

Las 25 tablas y como se enlazan, sin los campos, para ver la forma completa de un vistazo.

```mermaid
erDiagram
    AsignacionCurso ||--o{ Actividad : "asignacion"
    Periodo ||--o{ Actividad : "periodo"
    Maestro ||--o{ AsignacionCurso : "maestro"
    Curso ||--o{ AsignacionCurso : "curso"
    Seccion ||--o{ AsignacionCurso : "seccion"
    AsignacionCurso ||--o{ Asistencia : "asignacion"
    Inscripcion ||--o{ Asistencia : "inscripcion"
    Usuario ||--o{ Bitacora : "usuario"
    AsignacionCurso ||--o{ BloqueHorario : "asignacion"
    Inscripcion ||--o{ BoletaPeriodo : "inscripcion"
    Periodo ||--o{ BoletaPeriodo : "periodo"
    Inscripcion ||--o{ Cargo : "inscripcion"
    Cargo |o--o{ Cargo : "recargoDe"
    Grado ||--o{ Curso : "grado"
    Tarea ||--o{ EntregaTarea : "tarea"
    Inscripcion ||--o{ EntregaTarea : "inscripcion"
    Alumno ||--o{ Inscripcion : "alumno"
    Seccion ||--o{ Inscripcion : "seccion"
    CicloEscolar ||--o{ Inscripcion : "ciclo"
    Usuario |o--o{ Maestro : "usuario"
    Inscripcion ||--o{ Nota : "inscripcion"
    Curso ||--o{ Nota : "curso"
    Periodo ||--o{ Nota : "periodo"
    Maestro |o--o{ Nota : "registradaPor"
    Actividad ||--o{ NotaActividad : "actividad"
    Inscripcion ||--o{ NotaActividad : "inscripcion"
    Maestro ||--o{ PagoMaestro : "maestro"
    Usuario ||--o{ PagoMaestro : "registradoPor"
    CicloEscolar ||--o{ Periodo : "ciclo"
    Inscripcion ||--o{ Recibo : "inscripcion"
    Usuario ||--o{ Recibo : "emitidoPor"
    Usuario |o--o{ Recibo : "anuladoPor"
    Recibo ||--o{ ReciboDetalle : "recibo"
    Cargo ||--o{ ReciboDetalle : "cargo"
    Grado ||--o{ Seccion : "grado"
    CicloEscolar ||--o{ Seccion : "ciclo"
    AsignacionCurso ||--o{ Tarea : "asignacion"
```

### Las dos cadenas que hay que saber explicar

**La academica.** Un alumno no pertenece a un grado: pertenece a una *inscripcion*,
y esa inscripcion es la que vive en una seccion de un ciclo. Por eso un alumno puede
repetir grado o cambiarse de seccion sin perder su historial.

```
Alumno -> Inscripcion -> Seccion -> Grado
                      -> CicloEscolar
```

**La de cobros.** El cargo es lo que se debe; el recibo es lo que se pago.
Un recibo puede saldar varios cargos a la vez, y ReciboDetalle guarda cuanto
se aplico de cada uno.

```
Inscripcion -> Cargo -> ReciboDetalle <- Recibo
```

---

## Estructura academica

El esqueleto del colegio: el ciclo lectivo, sus grados y secciones, los cursos que se imparten, los periodos de evaluacion, y la inscripcion que ata a un alumno con una seccion de un ciclo.

```mermaid
erDiagram
    Grado ||--o{ Seccion : "grado"
    CicloEscolar ||--o{ Seccion : "ciclo"
    Grado ||--o{ Curso : "grado"
    CicloEscolar ||--o{ Periodo : "ciclo"
    Alumno ||--o{ Inscripcion : "alumno"
    Seccion ||--o{ Inscripcion : "seccion"
    CicloEscolar ||--o{ Inscripcion : "ciclo"
    CicloEscolar {
        Int id PK
        Int anio UK
        Boolean activo
    }
    Grado {
        Int id PK
        String nombre UK
        Int orden
    }
    Seccion {
        Int id PK
        String nombre
        Int gradoId
        Int cicloId
    }
    Curso {
        Int id PK
        String nombre
        Int gradoId
    }
    Periodo {
        Int id PK
        Int cicloId
        Int numero
        String nombre
        Boolean abierto
    }
    Alumno {
        Int id PK
        String carnet UK
        String cui UK
        String nombres
        String apellidos
        DateTime fechaNacimiento "opcional"
        String telefono "opcional"
        String encargadoNombre
        String encargadoTelefono "opcional"
        String encargadoCorreo "opcional"
        Boolean activo
    }
    Inscripcion {
        Int id PK
        Int alumnoId
        Int seccionId
        Int cicloId
        DateTime fecha
        Decimal montoInscripcion
        Decimal montoMensualidad
        Decimal descuentoInscripcion
        Decimal descuentoMensualidad
        String motivoDescuento "opcional"
    }
```

## Docencia y planilla

El maestro, los cursos y secciones que tiene asignados, su horario semanal y sus pagos de planilla.

```mermaid
erDiagram
    Usuario |o--o{ Maestro : "usuario"
    Maestro ||--o{ AsignacionCurso : "maestro"
    Curso ||--o{ AsignacionCurso : "curso"
    Seccion ||--o{ AsignacionCurso : "seccion"
    AsignacionCurso ||--o{ BloqueHorario : "asignacion"
    Maestro ||--o{ PagoMaestro : "maestro"
    Usuario ||--o{ PagoMaestro : "registradoPor"
    Maestro {
        Int id PK
        Int usuarioId UK
        String nombres
        String apellidos
        String telefono "opcional"
        Decimal salarioMensual
        Boolean activo
    }
    AsignacionCurso {
        Int id PK
        Int maestroId
        Int cursoId
        Int seccionId
    }
    BloqueHorario {
        Int id PK
        Int asignacionId
        Int diaSemana
        String horaInicio
        String horaFin
    }
    PagoMaestro {
        Int id PK
        Int maestroId
        Int mes
        Int anio
        Decimal sueldoBase
        Decimal bonificacion
        Decimal horasExtra
        Decimal igss
        Decimal descuentos
        Decimal monto
        DateTime fecha
        String observaciones "opcional"
        Int registradoPorId
    }
```

## Cobros y pagos

Lo que se le cobra a cada inscripcion y lo que se recibe. Un recibo puede cubrir varios cargos, y esa relacion de muchos a muchos la resuelve ReciboDetalle.

```mermaid
erDiagram
    Inscripcion ||--o{ Cargo : "inscripcion"
    Cargo |o--o{ Cargo : "recargoDe"
    Inscripcion ||--o{ Recibo : "inscripcion"
    Usuario ||--o{ Recibo : "emitidoPor"
    Usuario |o--o{ Recibo : "anuladoPor"
    Recibo ||--o{ ReciboDetalle : "recibo"
    Cargo ||--o{ ReciboDetalle : "cargo"
    Cargo {
        Int id PK
        Int inscripcionId
        Concepto concepto
        String descripcion
        Int mes "opcional"
        Decimal monto
        Decimal descuento
        Decimal pagado
        DateTime fechaVencimiento
        EstadoCargo estado
        Int recargoDeId UK
        DateTime creadoEn
    }
    Recibo {
        Int id PK
        String serie
        Int numero UK
        Int inscripcionId
        DateTime fecha
        Decimal total
        MetodoPago metodo
        String referencia "opcional"
        String observaciones "opcional"
        EstadoRecibo estado
        String motivoAnulacion "opcional"
        DateTime anuladoEn "opcional"
        Int anuladoPorId "opcional"
        Int emitidoPorId
    }
    ReciboDetalle {
        Int id PK
        Int reciboId
        Int cargoId
        Decimal monto
    }
    Configuracion {
        Int id PK
        String nombreColegio
        String direccion
        String telefono
        String serieRecibo
        Int cantidadMensualidades
        Int mesInicio
        Int diaVencimiento
        Int diasGracia
        Decimal recargoMora
        Int notaMinima
        Int zonaMax
        Boolean bloquearBoletaMora
    }
```

## Evaluacion

Las notas por periodo, desglosadas en actividades de zona, y la boleta que se genera al cerrar cada periodo.

```mermaid
erDiagram
    Inscripcion ||--o{ Nota : "inscripcion"
    Curso ||--o{ Nota : "curso"
    Periodo ||--o{ Nota : "periodo"
    Maestro |o--o{ Nota : "registradaPor"
    AsignacionCurso ||--o{ Actividad : "asignacion"
    Periodo ||--o{ Actividad : "periodo"
    Actividad ||--o{ NotaActividad : "actividad"
    Inscripcion ||--o{ NotaActividad : "inscripcion"
    Inscripcion ||--o{ BoletaPeriodo : "inscripcion"
    Periodo ||--o{ BoletaPeriodo : "periodo"
    Nota {
        Int id PK
        Int inscripcionId
        Int cursoId
        Int periodoId
        Decimal zona "opcional"
        Decimal examen "opcional"
        Decimal valor
        String observacion "opcional"
        Int registradaPorId "opcional"
        DateTime actualizadaEn
    }
    Actividad {
        Int id PK
        Int asignacionId
        Int periodoId
        String nombre
        Decimal puntos
        Int orden
    }
    NotaActividad {
        Int id PK
        Int actividadId
        Int inscripcionId
        Decimal puntos
    }
    BoletaPeriodo {
        Int id PK
        Int inscripcionId
        Int periodoId
        Int inasistencias
        String conducta "opcional"
        String comentario "opcional"
    }
```

## Asistencia y tareas

El seguimiento diario del alumno: si asistio, y que tareas se le asignaron y entrego.

```mermaid
erDiagram
    AsignacionCurso ||--o{ Asistencia : "asignacion"
    Inscripcion ||--o{ Asistencia : "inscripcion"
    AsignacionCurso ||--o{ Tarea : "asignacion"
    Tarea ||--o{ EntregaTarea : "tarea"
    Inscripcion ||--o{ EntregaTarea : "inscripcion"
    Asistencia {
        Int id PK
        Int asignacionId
        Int inscripcionId
        DateTime fecha
        EstadoAsistencia estado
        String observacion "opcional"
    }
    Tarea {
        Int id PK
        Int asignacionId
        String titulo
        String descripcion "opcional"
        DateTime fechaEntrega
        Decimal puntos
        DateTime creadoEn
    }
    EntregaTarea {
        Int id PK
        Int tareaId
        Int inscripcionId
        Boolean entregado
        DateTime fecha "opcional"
        Decimal nota "opcional"
    }
```

## Sistema

Lo que no es del negocio sino de la aplicacion: quien entra, que hizo, y el control de intentos fallidos de ingreso.

```mermaid
erDiagram
    Usuario ||--o{ Bitacora : "usuario"
    Usuario {
        Int id PK
        String nombre
        String email UK
        String passwordHash
        Rol rol
        Boolean activo
        DateTime creadoEn
    }
    Bitacora {
        Int id PK
        Int usuarioId
        String accion
        String entidad
        Int entidadId "opcional"
        String detalle "opcional"
        DateTime creadoEn
    }
    IntentoLogin {
        Int id PK
        String clave UK
        Int intentos
        DateTime bloqueadoHasta "opcional"
        DateTime ultimoIntento
    }
```

---

## Como regenerarlo

El diagrama sale del esquema, no se dibuja a mano. Si alguien agrega o cambia una
tabla, este archivo queda desactualizado y hay que volver a generarlo.

La comprobacion rapida de que sigue al dia: contar las tablas del documento y las
del esquema. Tienen que dar el mismo numero.

```powershell
Select-String -Path prisma\schema.prisma -Pattern "^model " | Measure-Object | Select-Object Count
```
