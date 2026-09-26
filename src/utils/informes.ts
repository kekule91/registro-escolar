import {
  Curso,
  Alumno,
  Actividad,
  RegistroNota,
  RegistroAsistencia,
  DiaNoClase,
  Bimestre,
  PeriodoNotas,
  SesionCurso
} from '../types';
import { generarSesionesCursoRango, keyAsistencia, normalizarEstadoPresentismo, fmtFecha } from './attendanceEngine';
import { BIMESTRES_2026 } from '../data/initialData';

export type OpcionPeriodoInforme =
  | '1° bimestre'
  | '2° bimestre / 1° cuatrimestre'
  | '3° bimestre'
  | '4° bimestre / 2° cuatrimestre'
  | 'Todo el año'
  | 'Personalizado';

export interface UmbralesAusentismo {
  amarillaInasistencias: number; // default 5
  amarillaPorcentaje: number;    // default 85
  rojaInasistencias: number;     // default 10
  rojaPorcentaje: number;        // default 75
}

export const UMBRALES_DEFAULT: UmbralesAusentismo = {
  amarillaInasistencias: 5,
  amarillaPorcentaje: 85,
  rojaInasistencias: 10,
  rojaPorcentaje: 75
};

export const STORAGE_KEY_UMBRALES = 'REGISTRO_ESCOLAR_UMBRALES_ASISTENCIA';

export function obtenerUmbralesAusentismo(): UmbralesAusentismo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UMBRALES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        amarillaInasistencias: Number(parsed.amarillaInasistencias) || 5,
        amarillaPorcentaje: Number(parsed.amarillaPorcentaje) || 85,
        rojaInasistencias: Number(parsed.rojaInasistencias) || 10,
        rojaPorcentaje: Number(parsed.rojaPorcentaje) || 75
      };
    }
  } catch (e) {
    console.error('Error al leer umbrales de ausentismo:', e);
  }
  return { ...UMBRALES_DEFAULT };
}

export function guardarUmbralesAusentismo(umbrales: UmbralesAusentismo): void {
  try {
    localStorage.setItem(STORAGE_KEY_UMBRALES, JSON.stringify(umbrales));
  } catch (e) {
    console.error('Error al guardar umbrales de ausentismo:', e);
  }
}

// ----------------------------------------------------
// RESOLVER RANGO DE FECHAS
// ----------------------------------------------------
export interface RangoFechas {
  inicio: string; // YYYY-MM-DD
  fin: string;    // YYYY-MM-DD
  nombre: string;
}

export function obtenerRangoFechasPeriodo(
  periodo: OpcionPeriodoInforme,
  bimestres: Bimestre[] = BIMESTRES_2026,
  customDesde?: string,
  customHasta?: string
): RangoFechas {
  if (periodo === 'Personalizado') {
    return {
      inicio: customDesde || '2026-03-01',
      fin: customHasta || '2026-12-18',
      nombre: `Personalizado (${customDesde || '—'} al ${customHasta || '—'})`
    };
  }

  if (periodo === 'Todo el año') {
    return {
      inicio: '2026-03-01',
      fin: '2026-12-18',
      nombre: 'Ciclo Lectivo Completo 2026'
    };
  }

  const bim = bimestres.find(b => b.nombre === periodo);
  if (bim) {
    return {
      inicio: bim.inicio,
      fin: bim.fin,
      nombre: bim.nombre
    };
  }

  return {
    inicio: '2026-03-01',
    fin: '2026-12-18',
    nombre: periodo
  };
}

// ----------------------------------------------------
// CÁLCULOS: TRABAJOS PENDIENTES
// ----------------------------------------------------
export const TIPOS_ACTIVIDAD_INFORME = [
  'Trabajo práctico',
  'Actividad teórico-práctica',
  'Prueba escrita',
  'Prueba oral'
];

export function esTipoActividadEvaluable(tipo: string): boolean {
  return TIPOS_ACTIVIDAD_INFORME.includes(tipo);
}

export interface EstadoActividadAlumno {
  actividadId: string;
  nombreActividad: string;
  tipo: string;
  fecha: string;
  periodo: string;
  curso: string;
  nota: string;
  observacion: string;
  // Categorías de estado
  esPendiente: boolean;
  esAusentePrueba: boolean; // "Ausente" en una prueba (recuperar)
  esEntregado: boolean;
  estadoEtiqueta: 'Entregado' | 'Pendiente' | 'No entregado' | 'Ausente (a recuperar)';
}

export interface ResumenPendientesAlumno {
  alumno: Alumno;
  curso: string;
  actividadesEvaluadas: EstadoActividadAlumno[];
  totalActividades: number;
  totalPendientes: number;
  totalAusentesPrueba: number;
  totalEntregadas: number;
  porcentajeCumplimiento: number; // 0 - 100
  nombresPendientes: string[];
  semaforo: 'verde' | 'amarillo' | 'rojo';
}

export function calcularPendientesAlumno(
  alumno: Alumno,
  actividadesCurso: Actividad[],
  notas: Record<string, RegistroNota>
): ResumenPendientesAlumno {
  const detalle: EstadoActividadAlumno[] = [];
  let pendientes = 0;
  let ausentesPrueba = 0;
  let entregadas = 0;
  const nombresPendientes: string[] = [];

  actividadesCurso.forEach(act => {
    const clave = `${act.id}|${act.curso}|${alumno.numero}`;
    const reg = notas[clave];
    const notaRaw = (reg?.nota || '').trim();
    const obs = reg?.observacion || '';

    const esPrueba = act.tipo === 'Prueba escrita' || act.tipo === 'Prueba oral';
    const esNotaAusente = notaRaw.toLowerCase() === 'ausente';
    const esNotaNoEntregado = notaRaw.toLowerCase() === 'no entregado';
    const esNotaPendiente = notaRaw.toLowerCase() === 'pendiente' || notaRaw === '';

    let esPendiente = false;
    let esAusente = false;
    let esEntregado = false;
    let estadoEtiqueta: EstadoActividadAlumno['estadoEtiqueta'] = 'Entregado';

    if (esPrueba && esNotaAusente) {
      esAusente = true;
      estadoEtiqueta = 'Ausente (a recuperar)';
      ausentesPrueba++;
      nombresPendientes.push(`${act.nombre} (Ausente)`);
    } else if (esNotaNoEntregado) {
      esPendiente = true;
      estadoEtiqueta = 'No entregado';
      pendientes++;
      nombresPendientes.push(act.nombre);
    } else if (esNotaPendiente) {
      esPendiente = true;
      estadoEtiqueta = 'Pendiente';
      pendientes++;
      nombresPendientes.push(act.nombre);
    } else {
      esEntregado = true;
      estadoEtiqueta = 'Entregado';
      entregadas++;
    }

    detalle.push({
      actividadId: act.id,
      nombreActividad: act.nombre,
      tipo: act.tipo,
      fecha: act.fecha || '',
      periodo: act.periodo,
      curso: act.curso,
      nota: notaRaw || '—',
      observacion: obs,
      esPendiente,
      esAusentePrueba: esAusente,
      esEntregado,
      estadoEtiqueta
    });
  });

  const totalActividades = actividadesCurso.length;
  const porcentajeCumplimiento = totalActividades > 0
    ? Math.round((entregadas / totalActividades) * 1000) / 10
    : 100;

  // Semáforo: 0 verde, 1–2 amarillo, 3 o más rojo (sumando pendientes normales)
  const totalDeuda = pendientes + ausentesPrueba;
  let semaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
  if (totalDeuda >= 3) {
    semaforo = 'rojo';
  } else if (totalDeuda >= 1) {
    semaforo = 'amarillo';
  }

  return {
    alumno,
    curso: alumno.curso,
    actividadesEvaluadas: detalle,
    totalActividades,
    totalPendientes: pendientes,
    totalAusentesPrueba: ausentesPrueba,
    totalEntregadas: entregadas,
    porcentajeCumplimiento,
    nombresPendientes,
    semaforo
  };
}

export interface ResumenActividadCurso {
  actividad: Actividad;
  alumnosDeudores: Array<{ alumno: Alumno; tipoDeuda: string; nota: string }>;
  totalAlumnos: number;
  totalPendientes: number;
  totalEntregados: number;
  porcentajeEntregado: number;
}

export interface ResumenPendientesCurso {
  cursoNombre: string;
  totalAlumnos: number;
  totalActividades: number;
  entregasEsperadas: number;
  entregasRealizadas: number;
  totalPendientes: number;
  totalAusentesPrueba: number;
  porcentajeCumplimiento: number;
  porAlumno: ResumenPendientesAlumno[];
  porActividad: ResumenActividadCurso[];
}

export function resumenPendientesCurso(
  cursoNombre: string,
  alumnosCurso: Alumno[],
  actividadesPeriodo: Actividad[],
  notas: Record<string, RegistroNota>
): ResumenPendientesCurso {
  const alumnosActivos = alumnosCurso.filter(a => a.activo);
  const actividadesFiltradas = actividadesPeriodo.filter(
    a => a.activa && esTipoActividadEvaluable(a.tipo) && (cursoNombre === 'Todos' || a.curso === cursoNombre)
  );

  const porAlumno = alumnosActivos.map(a => {
    // Si curso es 'Todos', filtrar las actividades que correspondan a su curso
    const acts = actividadesFiltradas.filter(act => act.curso === a.curso);
    return calcularPendientesAlumno(a, acts, notas);
  });

  // Ordenar alumnos de más a menos pendientes (total deuda = pendientes + ausentes)
  porAlumno.sort((a, b) => (b.totalPendientes + b.totalAusentesPrueba) - (a.totalPendientes + a.totalAusentesPrueba));

  // Resumen por actividad
  const porActividad: ResumenActividadCurso[] = actividadesFiltradas.map(act => {
    const alumnosEnEsteCurso = alumnosActivos.filter(a => a.curso === act.curso);
    const deudores: Array<{ alumno: Alumno; tipoDeuda: string; nota: string }> = [];
    let entregados = 0;

    alumnosEnEsteCurso.forEach(al => {
      const clave = `${act.id}|${act.curso}|${al.numero}`;
      const reg = notas[clave];
      const n = (reg?.nota || '').trim();
      const esPrueba = act.tipo === 'Prueba escrita' || act.tipo === 'Prueba oral';

      if (esPrueba && n.toLowerCase() === 'ausente') {
        deudores.push({ alumno: al, tipoDeuda: 'Ausente (a recuperar)', nota: n });
      } else if (n.toLowerCase() === 'no entregado' || n.toLowerCase() === 'pendiente' || n === '') {
        deudores.push({ alumno: al, tipoDeuda: n || 'Sin nota', nota: n || 'Pendiente' });
      } else {
        entregados++;
      }
    });

    const tot = alumnosEnEsteCurso.length;
    const pct = tot > 0 ? Math.round((entregados / tot) * 1000) / 10 : 0;

    return {
      actividad: act,
      alumnosDeudores: deudores,
      totalAlumnos: tot,
      totalPendientes: deudores.length,
      totalEntregados: entregados,
      porcentajeEntregado: pct
    };
  });

  const totalAlumnos = alumnosActivos.length;
  const totalActividades = actividadesFiltradas.length;
  const entregasEsperadas = porAlumno.reduce((acc, a) => acc + a.totalActividades, 0);
  const entregasRealizadas = porAlumno.reduce((acc, a) => acc + a.totalEntregadas, 0);
  const totalPendientes = porAlumno.reduce((acc, a) => acc + a.totalPendientes, 0);
  const totalAusentesPrueba = porAlumno.reduce((acc, a) => acc + a.totalAusentesPrueba, 0);
  const porcentajeCumplimiento = entregasEsperadas > 0
    ? Math.round((entregasRealizadas / entregasEsperadas) * 1000) / 10
    : 0;

  return {
    cursoNombre,
    totalAlumnos,
    totalActividades,
    entregasEsperadas,
    entregasRealizadas,
    totalPendientes,
    totalAusentesPrueba,
    porcentajeCumplimiento,
    porAlumno,
    porActividad
  };
}

// ----------------------------------------------------
// CÁLCULOS: AUSENTISMO
// ----------------------------------------------------
export interface DetalleSesionAsistenciaAlumno {
  ymd: string;
  dia: string;
  bloque: string;
  header: string;
  estado: string; // "P", "A", "T", "R", "J", "N/C", ""
  observacion: string;
}

export interface ResumenAusentismoAlumno {
  alumno: Alumno;
  curso: string;
  previstas: number;
  noCorresponde: number;
  corresponden: number;
  cargadas: number;
  sinCargar: number;
  P: number;
  A: number; // inasistencias
  T: number;
  R: number;
  J: number;
  computables: number; // P + T + R
  porcentajeAsistencia: number | null; // null si cargadas === 0
  porcentajeStr: string; // "XX.X %" o "—"
  rachaInasistenciasActual: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  detalleSesiones: DetalleSesionAsistenciaAlumno[];
}

export function calcularAusentismoAlumno(
  alumno: Alumno,
  cursoObj: Curso,
  sesionesPrevistas: SesionCurso[],
  asistencias: Record<string, RegistroAsistencia>,
  umbrales: UmbralesAusentismo = UMBRALES_DEFAULT
): ResumenAusentismoAlumno {
  let P = 0;
  let A = 0;
  let T = 0;
  let R = 0;
  let J = 0;
  let NC = 0;
  let cargadas = 0;

  const detalle: DetalleSesionAsistenciaAlumno[] = [];

  sesionesPrevistas.forEach(ses => {
    const key = keyAsistencia(alumno.curso, alumno.numero, ses.ymd, ses.bloque);
    const reg = asistencias[key];
    const estado = normalizarEstadoPresentismo(reg?.estado);
    const obs = reg?.observacion || '';

    detalle.push({
      ymd: ses.ymd,
      dia: ses.dia,
      bloque: ses.bloque,
      header: ses.header,
      estado,
      observacion: obs
    });

    if (estado === 'N/C') {
      NC++;
    } else if (estado === 'P') {
      P++;
      cargadas++;
    } else if (estado === 'A') {
      A++;
      cargadas++;
    } else if (estado === 'T') {
      T++;
      cargadas++;
    } else if (estado === 'R') {
      R++;
      cargadas++;
    } else if (estado === 'J') {
      J++;
      cargadas++;
    }
  });

  const previstas = sesionesPrevistas.length;
  const corresponden = Math.max(0, previstas - NC);
  const sinCargar = Math.max(0, corresponden - cargadas);
  const computables = P + T + R;

  const pct = cargadas > 0 ? Math.round((computables / cargadas) * 1000) / 10 : null;
  const porcentajeStr = pct !== null ? `${pct.toFixed(1)}%` : '—';

  // Racha de inasistencias consecutivas (recorriendo desde la última sesión con datos cargados hacia atrás)
  let racha = 0;
  // Recorremos de la más reciente a la más antigua
  for (let i = detalle.length - 1; i >= 0; i--) {
    const st = detalle[i].estado;
    if (st === 'N/C' || st === '') {
      // Si la última sesión no tuvo clase o aún no se cargó, seguimos buscando la última sesión dictada
      continue;
    }
    if (st === 'A') {
      racha++;
    } else {
      // Se corta la racha si encontramos P, T, R o J
      break;
    }
  }

  // Semáforo según umbrales:
  // Alerta roja: inasistencias >= rojaInasistencias O (pct !== null && pct < rojaPorcentaje)
  // Alerta amarilla: inasistencias >= amarillaInasistencias O (pct !== null && pct < amarillaPorcentaje)
  // Verde: resto
  let semaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
  if (A >= umbrales.rojaInasistencias || (pct !== null && pct < umbrales.rojaPorcentaje)) {
    semaforo = 'rojo';
  } else if (A >= umbrales.amarillaInasistencias || (pct !== null && pct < umbrales.amarillaPorcentaje)) {
    semaforo = 'amarillo';
  }

  return {
    alumno,
    curso: alumno.curso,
    previstas,
    noCorresponde: NC,
    corresponden,
    cargadas,
    sinCargar,
    P,
    A,
    T,
    R,
    J,
    computables,
    porcentajeAsistencia: pct,
    porcentajeStr,
    rachaInasistenciasActual: racha,
    semaforo,
    detalleSesiones: detalle
  };
}

export interface DetalleFechaAusentismo {
  ymd: string;
  dia: string;
  bloque: string;
  header: string;
  presentes: number; // P + T + R
  ausentes: number;   // A + J
  totalCargadas: number;
  porcentajeDia: number | null;
  porcentajeStr: string;
  menorA70: boolean;
}

export interface ResumenAusentismoCurso {
  cursoNombre: string;
  clasesPrevistas: number;
  clasesDictadas: number; // clases con al menos 1 registro cargado
  porcentajePromedioCurso: number | null;
  porcentajePromedioStr: string;
  totalAlertaAmarilla: number;
  totalAlertaRoja: number;
  porAlumno: ResumenAusentismoAlumno[];
  porFecha: DetalleFechaAusentismo[];
}

export function calcularAusentismoCurso(
  cursoObj: Curso,
  alumnosCurso: Alumno[],
  sesionesPrevistas: SesionCurso[],
  asistencias: Record<string, RegistroAsistencia>,
  umbrales: UmbralesAusentismo = UMBRALES_DEFAULT
): ResumenAusentismoCurso {
  const alumnosActivos = alumnosCurso.filter(a => a.activo);

  const porAlumno = alumnosActivos.map(al =>
    calcularAusentismoAlumno(al, cursoObj, sesionesPrevistas, asistencias, umbrales)
  );

  // Ordenar por inasistencias (A) descendente
  porAlumno.sort((a, b) => b.A - a.A);

  let alertaAmarilla = 0;
  let alertaRoja = 0;
  let sumaPorcentajes = 0;
  let conPorcentaje = 0;

  porAlumno.forEach(a => {
    if (a.semaforo === 'rojo') alertaRoja++;
    else if (a.semaforo === 'amarillo') alertaAmarilla++;

    if (a.porcentajeAsistencia !== null) {
      sumaPorcentajes += a.porcentajeAsistencia;
      conPorcentaje++;
    }
  });

  const promedioCurso = conPorcentaje > 0
    ? Math.round((sumaPorcentajes / conPorcentaje) * 10) / 10
    : null;

  // Por fecha
  const porFecha: DetalleFechaAusentismo[] = [];
  let clasesDictadas = 0;

  sesionesPrevistas.forEach(ses => {
    let p = 0;
    let a = 0;
    let cargadas = 0;

    alumnosActivos.forEach(al => {
      const key = keyAsistencia(cursoObj.curso, al.numero, ses.ymd, ses.bloque);
      const reg = asistencias[key];
      const st = normalizarEstadoPresentismo(reg?.estado);
      if (['P', 'T', 'R'].includes(st)) {
        p++;
        cargadas++;
      } else if (['A', 'J'].includes(st)) {
        a++;
        cargadas++;
      }
    });

    if (cargadas > 0) {
      clasesDictadas++;
    }

    const pct = cargadas > 0 ? Math.round((p / cargadas) * 1000) / 10 : null;
    const menorA70 = pct !== null && pct < 70;

    porFecha.push({
      ymd: ses.ymd,
      dia: ses.dia,
      bloque: ses.bloque,
      header: ses.header,
      presentes: p,
      ausentes: a,
      totalCargadas: cargadas,
      porcentajeDia: pct,
      porcentajeStr: pct !== null ? `${pct.toFixed(1)}%` : '—',
      menorA70
    });
  });

  return {
    cursoNombre: cursoObj.curso,
    clasesPrevistas: sesionesPrevistas.length,
    clasesDictadas,
    porcentajePromedioCurso: promedioCurso,
    porcentajePromedioStr: promedioCurso !== null ? `${promedioCurso.toFixed(1)}%` : '—',
    totalAlertaAmarilla: alertaAmarilla,
    totalAlertaRoja: alertaRoja,
    porAlumno,
    porFecha
  };
}

// ----------------------------------------------------
// GENERACIÓN DE TEXTOS SUGERIDOS PARA FAMILIA
// ----------------------------------------------------
export function generarTextoFamiliaPendientes(
  alumnoNombre: string,
  periodoNombre: string,
  nombresPendientes: string[]
): string {
  if (nombresPendientes.length === 0) {
    return `Estimada familia: Se informa que ${alumnoNombre} tiene al día todas las actividades y evaluaciones de ${periodoNombre}. ¡Felicitaciones por su compromiso!`;
  }

  const lista = nombresPendientes.join(', ');
  const cant = nombresPendientes.length;
  const palabra = cant === 1 ? 'actividad' : 'actividades';

  return `Estimada familia: Se informa que ${alumnoNombre} adeuda ${cant} ${palabra} de ${periodoNombre}: ${lista}. Se solicita regularizar la entrega a la brevedad para garantizar la continuidad pedagógica. Saludos cordiales.`;
}

// ----------------------------------------------------
// GENERACIÓN DE ASUNTO Y CUERPO DE EMAIL (MAILTO)
// ----------------------------------------------------
export interface DatosMailPendientes {
  destinatario: string;
  asunto: string;
  cuerpo: string;
  mailtoUrl: string;
}

export function generarMailInformePendientes(
  alumno: Alumno,
  periodoNombre: string,
  resumen: ResumenPendientesAlumno,
  fechaEmision: string = fmtFecha(new Date())
): DatosMailPendientes {
  const totalDeuda = resumen.totalPendientes + resumen.totalAusentesPrueba;
  const asunto = `Informe de Trabajos Pendientes - ${alumno.alumno} (${alumno.curso}) - ${periodoNombre}`;

  const pendientesListado = resumen.actividadesEvaluadas
    .filter(a => a.esPendiente)
    .map(a => `  • [${a.tipo}] "${a.nombreActividad}" — Estado: ${a.estadoEtiqueta}${a.fecha ? ` (${fmtFecha(a.fecha)})` : ''}${a.observacion ? ` | Obs: ${a.observacion}` : ''}`)
    .join('\n');

  const cuerpo = [
    `Estimada familia / Alumno/a ${alumno.alumno}:`,
    ``,
    `Le hacemos llegar el informe actualizado de trabajos prácticos y evaluaciones correspondientes a ${periodoNombre} (Ciclo Lectivo 2026).`,
    ``,
    `DATOS DEL ESTUDIANTE:`,
    `• Alumno/a: ${alumno.alumno}`,
    `• Curso: ${alumno.curso}`,
    `• N° de lista: ${alumno.numero}`,
    `• Período: ${periodoNombre}`,
    `• Fecha de emisión: ${fechaEmision}`,
    `• Porcentaje de cumplimiento: ${resumen.porcentajeCumplimiento}% (${resumen.totalEntregadas} entregadas de ${resumen.totalActividades} actividades evaluadas)`,
    ``,
    totalDeuda === 0
      ? `ESTADO ACTUAL: ¡Al día!\nEl estudiante no registra tareas adeudadas ni evaluaciones pendientes en este período. ¡Felicitaciones por su compromiso!`
      : `DETALLE DE ACTIVIDADES PENDIENTES O A RECUPERAR (${totalDeuda}):\n${pendientesListado}\n\nPor favor, solicitamos regularizar la entrega de las actividades adeudadas o comunicarse con el docente para acordar las pautas de recuperación y asegurar la continuidad pedagógica.`,
    ``,
    `Quedamos a su entera disposición ante cualquier duda o consulta.`,
    `Saludos cordiales,`,
    `Equipo Docente`,
    ``,
    `_______________________________________________________`,
    `Enviado desde Registro Escolar 2026 • Sistema de Notas y Presentismo`
  ].join('\n');

  const emailDestino = alumno.email ? alumno.email.trim() : '';
  const mailtoUrl = emailDestino
    ? `mailto:${encodeURIComponent(emailDestino)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    : `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;

  return {
    destinatario: emailDestino,
    asunto,
    cuerpo,
    mailtoUrl
  };
}

export function generarTextoFamiliaAusentismo(
  alumnoNombre: string,
  periodoNombre: string,
  inasistencias: number,
  porcentajeStr: string,
  rachaActual: number
): string {
  if (inasistencias === 0) {
    return `Estimada familia: Se informa que ${alumnoNombre} registra asistencia perfecta (${porcentajeStr}) durante ${periodoNombre}. ¡Felicitaciones por su constancia!`;
  }

  let mensajeRacha = '';
  if (rachaActual >= 2) {
    mensajeRacha = ` Actualmente acumula una racha de ${rachaActual} inasistencias consecutivas.`;
  }

  return `Estimada familia: Se informa que ${alumnoNombre} registra ${inasistencias} inasistencias durante ${periodoNombre}, alcanzando un ${porcentajeStr} de presentismo escolar.${mensajeRacha} Les recordamos que la asistencia regular a clases es indispensable para los procesos de aprendizaje. Quedamos a su disposición ante cualquier consulta.`;
}

// ----------------------------------------------------
// UTILIDAD DE EXPORTACIÓN CSV EXCEL (BOM UTF-8 + ;)
// ----------------------------------------------------
export function descargarCSVExcel(nombreArchivo: string, encabezados: string[], filas: (string | number)[][]): void {
  const lineas = [
    encabezados.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';'),
    ...filas.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
    )
  ];

  const contenido = '\uFEFF' + lineas.join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${nombreArchivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
