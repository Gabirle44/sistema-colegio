export const DIAS_SEMANA = [
  { id: 1, nombre: "Lunes", corto: "Lun" },
  { id: 2, nombre: "Martes", corto: "Mar" },
  { id: 3, nombre: "Miércoles", corto: "Mié" },
  { id: 4, nombre: "Jueves", corto: "Jue" },
  { id: 5, nombre: "Viernes", corto: "Vie" },
  { id: 6, nombre: "Sábado", corto: "Sáb" },
] as const;

export type DiaSemanaId = (typeof DIAS_SEMANA)[number]["id"];

export interface BloqueHorarioDetalle {
  id: number;
  asignacionId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  curso: {
    id: number;
    nombre: string;
  };
  maestro: {
    id: number;
    nombres: string;
    apellidos: string;
  };
  seccion: {
    id: number;
    nombre: string;
    grado: {
      id: number;
      nombre: string;
      orden: number;
    };
  };
}

export interface ConflictoHorario {
  tipo: "SECCION" | "MAESTRO";
  mensaje: string;
}
