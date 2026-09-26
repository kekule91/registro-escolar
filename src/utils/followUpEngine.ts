import { Curso, Alumno, DiaNoClase, Bimestre, RegistroAsistencia, SeguimientoClase, EstadoPresentismo } from '../types';
import {
  parseYmd,
  ymd,
  nombreDia,
  diaCodFecha,
  normalizarDiaCod,
  extraBloqueVisible,
  keyAsistencia
} from './attendanceEngine';

export interface DiaClaseInfo {
  ymd: string;
  fecha: Date;
  diaNombre: string;
  diaCod: string;
  bloques: string[];
  header: string;
}

export function keySeguimiento(curso: string, fechaYmd: string): string {
  return `${curso.trim()}|${fechaYmd.trim()}`;
}

/**
 * Obtiene todas las fechas de clase para un curso a lo largo del ciclo lectivo.
 */
export function obtenerDiasClaseCurso(
  curso: Curso,
  inicioStr: string,
  finStr: string,
  diasNoClase: DiaNoClase[]
): DiaClaseInfo[] {
  const setNoClase = new Set(diasNoClase.map(d => d.fecha));
  const bloques = String(curso.bloques || "")
    .split("|")
    .map(b => b.trim())
    .filter(Boolean);

  const mapaDias: Map<string, { fecha: Date; diaNombre: string; diaCod: string; bloques: string[] }> = new Map();

  const d = parseYmd(inicioStr);
  const end = parseYmd(finStr);
  const current = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  while (current <= end) {
    const fechaYmd = ymd(current);

    if (!setNoClase.has(fechaYmd)) {
      const diaCod = diaCodFecha(current);
      const bloquesDia: string[] = [];

      bloques.forEach(bloque => {
        const cod = normalizarDiaCod(bloque);
        if (diaCod === cod) {
          bloquesDia.push(bloque);
        }
      });

      if (bloquesDia.length > 0) {
        mapaDias.set(fechaYmd, {
          fecha: new Date(current),
          diaNombre: nombreDia(current),
          diaCod,
          bloques: bloquesDia
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  const resultado: DiaClaseInfo[] = [];
  Array.from(mapaDias.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([fechaYmd, info]) => {
      const extras = info.bloques.map(extraBloqueVisible).filter(Boolean).join(", ");
      const header = `${info.diaNombre.charAt(0).toUpperCase() + info.diaNombre.slice(1)} ${fechaYmd.split('-')[2]}/${fechaYmd.split('-')[1]}${extras ? ` (${extras})` : ''}`;
      resultado.push({
        ymd: fechaYmd,
        fecha: info.fecha,
        diaNombre: info.diaNombre,
        diaCod: info.diaCod,
        bloques: info.bloques,
        header
      });
    });

  return resultado;
}

/**
 * Obtiene todas las fechas del ciclo escolar analizando todos los bimestres.
 */
export function obtenerDiasClaseAnual(
  curso: Curso,
  bimestres: Bimestre[],
  diasNoClase: DiaNoClase[]
): DiaClaseInfo[] {
  if (!bimestres || bimestres.length === 0) return [];
  const inicioGlobal = bimestres[0].inicio;
  const finGlobal = bimestres[bimestres.length - 1].fin;
  return obtenerDiasClaseCurso(curso, inicioGlobal, finGlobal, diasNoClase);
}

/**
 * Encuentra el día de clase anterior al actual para el curso.
 */
export function buscarDiaClaseAnterior(
  fechaActual: string,
  diasClase: DiaClaseInfo[]
): DiaClaseInfo | null {
  for (let i = diasClase.length - 1; i >= 0; i--) {
    if (diasClase[i].ymd < fechaActual) {
      return diasClase[i];
    }
  }
  return null;
}

/**
 * Encuentra el día de clase siguiente al actual para el curso.
 */
export function buscarDiaClaseSiguiente(
  fechaActual: string,
  diasClase: DiaClaseInfo[]
): DiaClaseInfo | null {
  for (let i = 0; i < diasClase.length; i++) {
    if (diasClase[i].ymd > fechaActual) {
      return diasClase[i];
    }
  }
  return null;
}

/**
 * Busca el texto "Hasta dónde llegamos" de la clase inmediatamente anterior con registro.
 * Primero busca en el día de clase anterior oficial; si ése no tiene texto, busca hacia atrás
 * en cualquier seguimiento previo guardado con hastaDonde para ese curso.
 */
export function buscarCarryOverAnterior(
  curso: string,
  fechaActual: string,
  seguimientos: Record<string, SeguimientoClase>,
  diasClase: DiaClaseInfo[]
): { fecha: string; hastaDonde: string } | null {
  const diasPrevios = diasClase.filter(d => d.ymd < fechaActual).reverse();
  for (const dia of diasPrevios) {
    const key = keySeguimiento(curso, dia.ymd);
    const seg = seguimientos[key];
    if (seg && seg.hastaDonde && seg.hastaDonde.trim()) {
      return { fecha: dia.ymd, hastaDonde: seg.hastaDonde.trim() };
    }
  }

  const keysCurso = Object.keys(seguimientos)
    .filter(k => k.startsWith(`${curso}|`))
    .map(k => seguimientos[k])
    .filter(s => s && s.fecha < fechaActual && s.hastaDonde && s.hastaDonde.trim())
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (keysCurso.length > 0) {
    return { fecha: keysCurso[0].fecha, hastaDonde: keysCurso[0].hastaDonde.trim() };
  }

  return null;
}

export interface ResumenAsistenciaDia {
  presentes: Alumno[];
  ausentes: Alumno[];
  tardes: Alumno[];
  retirados: Alumno[];
  justificadas: Alumno[];
  noCorresponde: Alumno[];
  sinCargar: Alumno[];
  totales: {
    totalAlumnos: number;
    P: number;
    A: number;
    T: number;
    R: number;
    J: number;
    NC: number;
    sinCargar: number;
  };
}

/**
 * Agrupa la asistencia de los alumnos del curso en una fecha determinada.
 */
export function agruparAsistenciaDia(
  curso: string,
  fechaYmd: string,
  alumnosCurso: Alumno[],
  asistencias: Record<string, RegistroAsistencia>,
  bloques: string[]
): ResumenAsistenciaDia {
  const primerBloque = bloques.length > 0 ? bloques[0] : "";

  const presentes: Alumno[] = [];
  const ausentes: Alumno[] = [];
  const tardes: Alumno[] = [];
  const retirados: Alumno[] = [];
  const justificadas: Alumno[] = [];
  const noCorresponde: Alumno[] = [];
  const sinCargar: Alumno[] = [];

  alumnosCurso.forEach(alumno => {
    const key = keyAsistencia(curso, alumno.numero, fechaYmd, primerBloque);
    const estado = asistencias[key]?.estado || "";

    switch (estado) {
      case "P":
        presentes.push(alumno);
        break;
      case "A":
        ausentes.push(alumno);
        break;
      case "T":
        tardes.push(alumno);
        break;
      case "R":
        retirados.push(alumno);
        break;
      case "J":
        justificadas.push(alumno);
        break;
      case "N/C":
        noCorresponde.push(alumno);
        break;
      default:
        sinCargar.push(alumno);
        break;
    }
  });

  return {
    presentes,
    ausentes,
    tardes,
    retirados,
    justificadas,
    noCorresponde,
    sinCargar,
    totales: {
      totalAlumnos: alumnosCurso.length,
      P: presentes.length,
      A: ausentes.length,
      T: tardes.length,
      R: retirados.length,
      J: justificadas.length,
      NC: noCorresponde.length,
      sinCargar: sinCargar.length
    }
  };
}
