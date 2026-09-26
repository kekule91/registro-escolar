import { Curso, Alumno, Bimestre, MesEscolar, DiaNoClase, Actividad, RegistroNota, SeguimientoClase } from '../types';

export const CURSOS_INICIALES: Curso[] = [
  { curso: "35 TM", hojaNotas: "Notas - 35 TM", hojaToma: "Toma - 35 TM", bloques: "LUN|MIE" },
  { curso: "42 TM", hojaNotas: "Notas - 42 TM", hojaToma: "Toma - 42 TM", bloques: "LUN|MAR" },
  { curso: "45 TM", hojaNotas: "Notas - 45 TM", hojaToma: "Toma - 45 TM", bloques: "MAR|MAR 7ma|MIE" },
  { curso: "42 TT", hojaNotas: "Notas - 42 TT", hojaToma: "Toma - 42 TT", bloques: "MIE|VIE" },
  { curso: "53 TT", hojaNotas: "Notas - 53 TT", hojaToma: "Toma - 53 TT", bloques: "MIE|VIE" },
];

export const BIMESTRES_2026: Bimestre[] = [
  { nombre: "1° bimestre", inicio: "2026-03-02", fin: "2026-05-07", escala: "BIMESTRAL_EP_S_A" },
  { nombre: "2° bimestre / 1° cuatrimestre", inicio: "2026-05-08", fin: "2026-07-17", escala: "NUMERICA_1_10" },
  { nombre: "3° bimestre", inicio: "2026-08-03", fin: "2026-10-02", escala: "BIMESTRAL_EP_S_A" },
  { nombre: "4° bimestre / 2° cuatrimestre", inicio: "2026-10-05", fin: "2026-12-03", escala: "NUMERICA_1_10" },
];

export const MESES_2026: MesEscolar[] = [
  { mes: "Marzo 2026", inicio: "2026-03-01", fin: "2026-03-31" },
  { mes: "Abril 2026", inicio: "2026-04-01", fin: "2026-04-30" },
  { mes: "Mayo 2026", inicio: "2026-05-01", fin: "2026-05-31" },
  { mes: "Junio 2026", inicio: "2026-06-01", fin: "2026-06-30" },
  { mes: "Julio 2026", inicio: "2026-07-01", fin: "2026-07-31" },
  { mes: "Agosto 2026", inicio: "2026-08-01", fin: "2026-08-31" },
  { mes: "Septiembre 2026", inicio: "2026-09-01", fin: "2026-09-30" },
  { mes: "Octubre 2026", inicio: "2026-10-01", fin: "2026-10-31" },
  { mes: "Noviembre 2026", inicio: "2026-11-01", fin: "2026-11-30" },
  { mes: "Diciembre 2026", inicio: "2026-12-01", fin: "2026-12-18" },
];

export const DIAS_NO_CLASE_INICIALES: DiaNoClase[] = [
  { fecha: "2026-03-24", motivo: "Día de la Memoria" },
  { fecha: "2026-04-02", motivo: "Día del Veterano y de los Caídos en Malvinas" },
  { fecha: "2026-04-03", motivo: "Viernes Santo" },
  { fecha: "2026-05-01", motivo: "Día del Trabajador" },
  { fecha: "2026-05-25", motivo: "Día de la Revolución de Mayo" },
  { fecha: "2026-06-17", motivo: "Paso a la Inmortalidad de Güemes" },
  { fecha: "2026-06-20", motivo: "Paso a la Inmortalidad de Belgrano" },
  { fecha: "2026-07-09", motivo: "Día de la Independencia" },
  { fecha: "2026-07-20", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-21", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-22", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-23", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-24", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-27", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-28", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-29", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-30", motivo: "Receso escolar invernal" },
  { fecha: "2026-07-31", motivo: "Receso escolar invernal" },
  { fecha: "2026-08-17", motivo: "Paso a la Inmortalidad de San Martín" },
  { fecha: "2026-10-12", motivo: "Día del Respeto a la Diversidad Cultural" },
  { fecha: "2026-11-20", motivo: "Día de la Soberanía Nacional" },
  { fecha: "2026-12-08", motivo: "Inmaculada Concepción" },
];

/** Datos DEMO únicamente. No son alumnos reales. Cada docente carga su propia nómina. */
export const ALUMNOS_INICIALES: Alumno[] = [
  { curso: "35 TM", numero: 1, alumno: "García Demo Ana", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 2, alumno: "Pérez Ejemplo Luis", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 3, alumno: "López Muestra Sofía", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 4, alumno: "Martínez Demo Mateo", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 5, alumno: "Fernández Ejemplo Valentina", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 1, alumno: "Rodríguez Demo Camila", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 2, alumno: "Sánchez Ejemplo Tomás", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 3, alumno: "Romero Muestra Lucía", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 4, alumno: "Díaz Demo Benjamín", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 5, alumno: "Álvarez Ejemplo Martina", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 1, alumno: "Torres Demo Nicolás", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 2, alumno: "Ruiz Ejemplo Emilia", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 3, alumno: "Jiménez Muestra Santiago", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 4, alumno: "Moreno Demo Catalina", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 5, alumno: "Muñoz Ejemplo Felipe", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 1, alumno: "Gómez Demo Isabella", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 2, alumno: "Castro Ejemplo Lautaro", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 3, alumno: "Ortiz Muestra Emma", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 4, alumno: "Silva Demo Thiago", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 5, alumno: "Vargas Ejemplo Olivia", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 1, alumno: "Ramos Demo Julián", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 2, alumno: "Herrera Ejemplo Mía", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 3, alumno: "Molina Muestra Bruno", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 4, alumno: "Navarro Demo Paula", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 5, alumno: "Iglesias Ejemplo Diego", activo: true, observaciones: "" },
];

export const ACTIVIDADES_INICIALES: Actividad[] = [];
export const REGISTROS_NOTAS_INICIALES: RegistroNota[] = [];
export const SEGUIMIENTOS_INICIALES: Record<string, SeguimientoClase> = {};
