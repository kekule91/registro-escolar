export type TipoActividad =
  | "Trabajo práctico"
  | "Actividad teórico-práctica"
  | "Prueba escrita"
  | "Prueba oral"
  | "Nota bimestral conceptual"
  | "Nota cuatrimestral numérica"
  | "Presentismo";

export type PeriodoNotas =
  | "1° bimestre"
  | "2° bimestre / 1° cuatrimestre"
  | "3° bimestre"
  | "4° bimestre / 2° cuatrimestre";

export type EscalaNotas =
  | "CONCEPTUAL"
  | "NUMERICA_1_10"
  | "BIMESTRAL_EP_S_A"
  | "PRESENTISMO";

export type EstadoPresentismo = "P" | "A" | "T" | "R" | "J" | "N/C" | "";

export interface Curso {
  curso: string;
  hojaNotas: string;
  hojaToma: string;
  bloques: string; // ej: "LUN|MIE" o "MAR|MAR 7ma|MIE"
}

export interface Alumno {
  curso: string;
  numero: number;
  alumno: string;
  activo: boolean;
  email?: string;
  observaciones?: string;
}

export interface Actividad {
  id: string;
  curso: string;
  nombre: string;
  tipo: TipoActividad;
  periodo: PeriodoNotas;
  fecha: string; // YYYY-MM-DD
  escala: EscalaNotas;
  activa: boolean;
  observaciones?: string;
  creado: string;
}

export interface RegistroNota {
  clave: string; // actividadId|curso|numero
  actividadId: string;
  curso: string;
  numero: number;
  alumno: string;
  tipo: TipoActividad;
  periodo: PeriodoNotas;
  actividad: string;
  fecha?: string;
  escala: EscalaNotas;
  nota: string;
  notaNormalizada: number | string;
  observacion?: string;
  actualizado: string;
  usuario?: string;
  origen?: string;
}

export interface RegistroAsistencia {
  clave: string; // curso|numero|fechaYmd|bloque
  curso: string;
  numero: number;
  alumno: string;
  fecha: string; // YYYY-MM-DD
  dia: string;
  mes: string;
  bimestre: string;
  bloque: string;
  estado: EstadoPresentismo;
  observacion?: string;
  actualizado: string;
  usuario?: string;
}

export interface SesionCurso {
  fecha: Date;
  ymd: string;
  dia: string;
  bloque: string;
  orden: number;
  header: string;
}

export interface Bimestre {
  nombre: PeriodoNotas;
  inicio: string;
  fin: string;
  escala: EscalaNotas;
}

export interface MesEscolar {
  mes: string;
  inicio: string;
  fin: string;
}

export interface DiaNoClase {
  fecha: string; // YYYY-MM-DD
  motivo: string;
}

export interface SugerenciaBimestralResultado {
  nota: string;
  razon: string;
}

export interface SeguimientoClase {
  clave: string; // `${curso}|${fecha}`
  curso: string;
  fecha: string; // YYYY-MM-DD
  planMd: string;
  observaciones: string;
  hastaDonde: string;
  actualizado?: string;
  usuario?: string;
}
