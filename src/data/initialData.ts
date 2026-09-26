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
  // Feriados nacionales oficiales Argentina 2026
  { fecha: "2026-03-24", motivo: "Día de la Memoria" },
  { fecha: "2026-04-02", motivo: "Día del Veterano y de los Caídos en Malvinas" },
  { fecha: "2026-04-03", motivo: "Viernes Santo" },
  { fecha: "2026-05-01", motivo: "Día del Trabajador" },
  { fecha: "2026-05-25", motivo: "Día de la Revolución de Mayo" },
  { fecha: "2026-06-17", motivo: "Paso a la Inmortalidad de Güemes" },
  { fecha: "2026-06-20", motivo: "Paso a la Inmortalidad de Belgrano" },
  { fecha: "2026-07-09", motivo: "Día de la Independencia" },
  // Receso invernal (2026-07-20 a 2026-07-31)
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
  // 35 TM
  { curso: "35 TM", numero: 1, alumno: "García Demo Ana", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 2, alumno: "Pérez Ejemplo Luis", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 3, alumno: "López Muestra Sofía", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 4, alumno: "Martínez Demo Mateo", activo: true, observaciones: "" },
  { curso: "35 TM", numero: 5, alumno: "Fernández Ejemplo Valentina", activo: true, observaciones: "" },

  // 42 TM
  { curso: "42 TM", numero: 1, alumno: "Rodríguez Demo Camila", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 2, alumno: "Sánchez Ejemplo Tomás", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 3, alumno: "Romero Muestra Lucía", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 4, alumno: "Díaz Demo Benjamín", activo: true, observaciones: "" },
  { curso: "42 TM", numero: 5, alumno: "Álvarez Ejemplo Martina", activo: true, observaciones: "" },

  // 45 TM
  { curso: "45 TM", numero: 1, alumno: "Torres Demo Nicolás", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 2, alumno: "Ruiz Ejemplo Emilia", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 3, alumno: "Jiménez Muestra Santiago", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 4, alumno: "Moreno Demo Catalina", activo: true, observaciones: "" },
  { curso: "45 TM", numero: 5, alumno: "Muñoz Ejemplo Felipe", activo: true, observaciones: "" },

  // 42 TT
  { curso: "42 TT", numero: 1, alumno: "Gómez Demo Isabella", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 2, alumno: "Castro Ejemplo Lautaro", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 3, alumno: "Ortiz Muestra Emma", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 4, alumno: "Silva Demo Thiago", activo: true, observaciones: "" },
  { curso: "42 TT", numero: 5, alumno: "Vargas Ejemplo Olivia", activo: true, observaciones: "" },

  // 53 TT
  { curso: "53 TT", numero: 1, alumno: "Ramos Demo Julián", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 2, alumno: "Herrera Ejemplo Mía", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 3, alumno: "Molina Muestra Bruno", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 4, alumno: "Navarro Demo Paula", activo: true, observaciones: "" },
  { curso: "53 TT", numero: 5, alumno: "Iglesias Ejemplo Diego", activo: true, observaciones: "" },
];

export const ACTIVIDADES_INICIALES: Actividad[] = [
  // 35 TM
  {
    id: "ACT-20260310-001",
    curso: "35 TM",
    nombre: "TP N°1: Diagnóstico y conceptos iniciales",
    tipo: "Trabajo práctico",
    periodo: "1° bimestre",
    fecha: "2026-03-16",
    escala: "CONCEPTUAL",
    activa: true,
    observaciones: "Evaluación inicial de saberes feceso invernalopo: "Tracda d3-02", fin: "20 "Tso: "5ACT-20260310-001",
 2  cu2so: "35 TM",
    nombre: "TP N°1: DPbsebMíscrita stiUnral" 1o: "Trabajo prPbsebM�escritaiodo: "1° bimestre",
    fecha: "2026-03-16",
   4-13ala: "CONCEPTUAL_10" },
];

exva: true,
    observaciones: "Evaluaciónx sone sd [
 uresescritoo: "Tracda d3-02", fin: o:  "Tso: "5ACT-20260310-001",
401 cu3so: "35 TM",
    nombre: "TP N°1: D] = [
  / Teórper-P
    pe   GuSoberanejerc6-12po: "Trabajo pr] = [
  / teórper-,
    peaiodo: "1° bimestre",
    fecha: "2026-03-16",
   4-22ala: "CONCEPTUAL",
    activa: true,
    observaciones: "Evaluacióla e Mayo" }grupresen c
  /o: "Tracda d3-02", fin: "20 "Tso: "5ACT-20260310-001",
428 cu4so: "35 TM",
    nombre: "TP N°1: D TT" re",
    fecha: "20bajo pr TT" 
    feresinicialureiodo: "1° bimestre",
    fecha: "2026-03-16",
   ala: "a: "CONCEPTUALEP_S_A" },
  { nova: true,
    observaciones: "EvaluacióCimplo re",
    fecha: "20cda d3-02", fin: 280 "Tso:M
  { curso: "4ACT-20260310-001",
    cu5so: "35 TM",
  mero: 5e: "TP N°1: DiagnóstiAemplisisos ra e Mayo" }ranminblemapo: "Trabajo práctico",
    periodo: "1° bimestre",
    fecha: "2026-03-16",
    es7ala: "CONCEPTUAL",
    activa: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: "20 "Tso: "5ACT-20260310-001",
 2ala06so: "35 TM",
  mero: 5e: "TP N°1: DPbsebMíscrita stiBIE|VI teivocepto1o: "Trabajo prPbsebM�escritaiodo: "1° bimestre",
    fecha: "2026-03-16",
   4-14ala: "CONCEPTUAL_10" },
];

exva: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: o50 "Tso: "5ACT-20260310-001",
428 cu7so: "35 TM",
  mero: 5e: "TP N°1: D TT" re",
    fecha: "20bajo pr TT" 
    feresinicialureiodo: "1° bimestre",
    fecha: "2026-03-16",
   ala: "a: "CONCEPTUALEP_S_A" },
  { nova: true,
    observaciones: "EvaluacióCimplo re",
    fecha: "20cda d3-02", fin: 280 "Tso:M
  { c   id: "ACT-20260310-001",
    cu8so: "35 TM",
  m nombre: "TP N°1: DiagnóstiFund son opo: "Trabajo práctico",
    periodo: "1° bimestre",
    fecha: "2026-03-16",
    es8ala: "CONCEPTUAL",
    activa: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: "20 "Tso: "5ACT-20260310-001",
 2ala09so: "35 TM",
  m nombre: "TP N°1: DPbsebMíscrita so: "Trabajo prPbsebM�escritaiodo: "1° bimestre",
    fecha: "2026-03-16",
   4-15ala: "CONCEPTUAL_10" },
];

exva: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: o50 "Tso:T
  { curso: "4ACT-20260310-001",
    c
exva: tr TT", numero: 5e: "TP N°1: DiagnóstiIno Lducayo" }sidadmatciono: "Trabajo práctico",
    periodo: "1° bimestre",
    fecha: "2026-03-16",
    es8ala: "CONCEPTUAL",
    activa: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: "20 "Tso: "5ACT-20260310-001",
 2ala11xva: tr TT", numero: 5e: "TP N°1: DPbsebMíscrita so: "Trabajo prPbsebM�escritaiodo: "1° bimestre",
    fecha: "2026-03-16",
   4-17ala: "CONCEPTUAL_10" },
];

exva: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: o50 "Tso:T
  { curso: "5ACT-20260310-001",
    c
2so: "35 TM",
  mero: 5e: "TP N°1: DiagnóstiProyectoe sabereo: "Trabajo práctico",
    periodo: "1° bimestre",
    fecha: "2026-03-16",
    es8ala: "CONCEPTUAL",
    activa: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: "20 "Tso: "5ACT-20260310-001",
 2ala13so: "35 TM",
  mero: 5e: "TP N°1: DPbsebMíscrita so: "Trabajo prPbsebM�escritaiodo: "1° bimestre",
    fecha: "2026-03-16",
   4-17ala: "CONCEPTUAL_10" },
];

exva: true,
    observaciones: "Evaluacióo: "Tracda d3-02", fin: o50 "Tsatos DEMO TT", amentc reales. Cafi  pe12pte. No son aluconst ALUMNOS_INREGI_A"O_INITAS: Actividad[ta, Seguimie mes: "Mar "Traclave60310-001",
    cur|  nom|1xva: true,
 
  /I260310-001",
    curso: "35 TM",
    nombre: "TPalumno: "a: trurcía Demo Ana", activo: t "Trabajo práctico",
    periodo: "1° bimestre",
    fecha: "20ue,
 
  /: Diagnóstico y conceptos iniciales",
    tipo: "Tra26-03-16",
    escala: "CONCEPTUAL",
    activa: trnmieiónxceactieiva: trnmieNormalizadao: "vaciones: "EvaluEjempy buen t�cticoha: "20ue,ualizado-16",
    es7 10:00:00ha: "20origeuEjemanurei "Tso: "5ACT-2clave60310-001",
    cur|  nom|2xva: true,
 
  /I260310-001",
    curso: "35 TM",
    nombre: "TPalumno:2"a: trurcía Demplo Luis", activo: t "Trabajo práctico",
    periodo: "1° bimestre",
    fecha: "20ue,
 
  /: Diagnóstico y conceptos iniciales",
    tipo: "Tra26-03-16",
    escala: "CONCEPTUAL",
    activa: trnmieióimiebleiva: trnmieNormalizadao:4"vaciones: "EvaluEjeha: "20ue,ualizado-16",
    es7 10:00:00ha: "20origeuEjemanurei "Tso: "5ACT-2clave60310-001",
 2  cu2|  nom|1xva: true,
 
  /I260310-001",
 2  cu2so: "35 TM",
    nombre: "TPalumno: "a: trurcía Demo Ana", activo: t "Trabajo prPbsebM�escritaiodo: "1° bimestre",
    fecha: "20ue,
 
  /: DPbsebMíscrita stiUnral" 1o: "Tra26-03-16",
   4-13ala: "CONCEPTUAL_10" },
];

exva: trnmieió9iva: trnmieNormalizadao:9"vaciones: "EvaluEjeha: "20ue,ualizado-16",
   4-14 11:00:00ha: "20origeuEjemanurei "Tso: "5ACT-2clave60310-001",
 2  cu2|  nom|3xva: true,
 
  /I260310-001",
 2  cu2so: "35 TM",
    nombre: "TPalumno:3"a: trurcía Destra Sofía", activo: t "Trabajo prPbsebM�escritaiodo: "1° bimestre",
    fecha: "20ue,
 
  /: DPbsebMíscrita stiUnral" 1o: "Tra26-03-16",
   4-13ala: "CONCEPTUAL_10" },
];

exva: trnmieió7iva: trnmieNormalizadao:7"vaciones: "EvaluEjeha: "20ue,ualizado-16",
   4-14 11:00:00ha: "20origeuEjemanurei "Tst const ACTIVIDADESEGUIMIENTOS: Actividad[tacord< feingntoClase } from '.>es:5ACT"  nom|2, fin: "20:"5ACT-2clave603  nom|2, fin: "20o: "35 TM",
    nombre: "T26-03-16",
    e"20o: "35planM/: `##ico y conceptoIsaberesyiPres} faayo" }ran" },atcion

###iObje, obs
-iPres} farn" s pctivs}rant�ctico, crit° bs}rane inicial des ironogrameto a ciclnicio:.
-in inicreceso invernalop}ranm y itudesos mina.eal"es}ran" }matcion.

###i] = [
  /es
1.iconámNo }ranmies} faayo" }s iniformaayo" }rangrupos}rant�ctico.
2. Lectu, acompctivdeto a cono atoepealgógept.
3. GuSobero y concep3-1Ejerc6-12p 1rur 5sen pctejas }vacioso3ial 5inifoe,
 es en Malvinas" },
  { fecha: "2026-04eoso3ial 5iniy 2
 es 0orrrranmies}s:5 e"2co, ur 5seimgrupa
    1y itTiona
 
  ódo" }yI_Ati mot", moties.`d3-02", fin: o50 "TsatB,
 angrudisivdictu, acolmpctiv., f0haACTó a cer"202derniod4}yItiona
 
  ódo" } en",
    f�xi in"Tso:.saberesha,
 Dond    Llegones:ha,
  olmítem 2
.icon�gr 5sen pctejas }v; queTó -20 ist ALolmeoso3ial  3.0:00:00ha: "20origeuEjemanure02T12t cons.000ZOS: Ac};
