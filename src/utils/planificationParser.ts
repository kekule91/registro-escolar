/**
 * Parser y validador de archivos de Planificación Multidía en formato Markdown
 * Compatible con la especificación PLANIFICACION.md
 */

export interface ParsedDayPlan {
  id: string;
  fecha: string; // YYYY-MM-DD normalizado
  fechaOriginal: string;
  titulo: string;
  planMd: string;
  observaciones?: string;
  hastaDonde?: string;
  lineaInicio: number;
  esValido: boolean;
  errores: string[];
  advertencias: string[];
}

export interface ParseResult {
  cursoDetectado?: string;
  tituloDocumento?: string;
  diasValidos: ParsedDayPlan[];
  diasConError: ParsedDayPlan[];
  totalDias: number;
  erroresGenerales: string[];
  advertenciasGenerales: string[];
  rawText: string;
}

// Regex para detectar fecha en formatos comunes:
// 1. YYYY-MM-DD (ej: 2026-03-02)
const REGEX_ISO_DATE = /\b(202\d)-(0[1-9]|1[0-2]|[1-9])-(0[1-9]|[12]\d|3[01]|[1-9])\b/;

// 2. DD/MM/YYYY o D/M/YYYY o DD-MM-YYYY (ej: 02/03/2026, 2/3/2026, 02-03-2026)
const REGEX_LATAM_DATE = /\b(0[1-9]|[12]\d|3[01]|[1-9])[\/\-](0[1-9]|1[0-2]|[1-9])[\/\-](202\d)\b/;

/**
 * Normaliza una cadena de fecha a YYYY-MM-DD.
 */
export function normalizarFecha(str: string): { fechaYmd: string; fechaOriginal: string } | null {
  const matchIso = str.match(REGEX_ISO_DATE);
  if (matchIso) {
    const y = matchIso[1];
    const m = matchIso[2].padStart(2, '0');
    const d = matchIso[3].padStart(2, '0');
    return {
      fechaYmd: `${y}-${m}-${d}`,
      fechaOriginal: matchIso[0]
    };
  }

  const matchLatam = str.match(REGEX_LATAM_DATE);
  if (matchLatam) {
    const d = matchLatam[1].padStart(2, '0');
    const m = matchLatam[2].padStart(2, '0');
    const y = matchLatam[3];
    return {
      fechaYmd: `${y}-${m}-${d}`,
      fechaOriginal: matchLatam[0]
    };
  }

  return null;
}

/**
 * Extrae subsecciones especiales como Observaciones y Hasta dónde llegamos si están explícitamente definidas.
 */
function extraerSeccionesEspeciales(texto: string): {
  planLimpio: string;
  observaciones?: string;
  hastaDonde?: string;
} {
  let observaciones: string | undefined;
  let hastaDonde: string | undefined;

  // Regex para 'Hasta dónde llegamos' o 'Hasta dónde' o 'Continuamos desde'
  // Puede ser un encabezado '### Hasta dónde llegamos' o una línea '**Hasta dónde:**'
  const regexHastaDondeHeader = /(?:^|\n)(?:#{2,4}\s*Hasta d[oó]nde(?: llegamos)?[\s:]*)([\s\S]*?)(?=\n#{2,4}\s|\n\*\*|$)/i;
  const matchHastaDondeH = texto.match(regexHastaDondeHeader);
  if (matchHastaDondeH) {
    hastaDonde = matchHastaDondeH[1].trim();
    texto = texto.replace(regexHastaDondeHeader, '\n');
  } else {
    const regexHastaDondeLine = /(?:^|\n)\*\*(?:Hasta d[oó]nde(?: llegamos)?|Avance):\*\*\s*([^\n]+)/i;
    const matchLine = texto.match(regexHastaDondeLine);
    if (matchLine) {
      hastaDonde = matchLine[1].trim();
      texto = texto.replace(regexHastaDondeLine, '\n');
    }
  }

  // Regex para 'Observaciones'
  const regexObsHeader = /(?:^|\n)(?:#{2,4}\s*Observaciones[\s:]*)([\s\S]*?)(?=\n#{2,4}\s|\n\*\*|$)/i;
  const matchObsH = texto.match(regexObsHeader);
  if (matchObsH) {
    observaciones = matchObsH[1].trim();
    texto = texto.replace(regexObsHeader, '\n');
  } else {
    const regexObsLine = /(?:^|\n)\*\*Observaciones:\*\*\s*([^\n]+)/i;
    const matchLine = texto.match(regexObsLine);
    if (matchLine) {
      observaciones = matchLine[1].trim();
      texto = texto.replace(regexObsLine, '\n');
    }
  }

  return {
    planLimpio: texto.trim(),
    observaciones: observaciones || undefined,
    hastaDonde: hastaDonde || undefined
  };
}

/**
 * Analiza un archivo Markdown multidía y extrae las clases planificadas.
 */
export function parsePlanificacionMarkdown(content: string, cursosDisponibles: string[] = []): ParseResult {
  const result: ParseResult = {
    diasValidos: [],
    diasConError: [],
    totalDias: 0,
    erroresGenerales: [],
    advertenciasGenerales: [],
    rawText: content
  };

  const texto = (content || "").trim();
  if (!texto) {
    result.erroresGenerales.push("El archivo o texto ingresado está vacío.");
    return result;
  }

  const lineas = texto.split(/\r?\n/);

  // 1. Detectar curso en encabezados iniciales
  // Ej: "# Planificación 35 TM" o "**Curso:** 35 TM"
  for (let i = 0; i < Math.min(lineas.length, 10); i++) {
    const linea = lineas[i];
    // Buscar coincidencia exacta con cursos conocidos
    for (const c of cursosDisponibles) {
      const regexCurso = new RegExp(`\\b${c.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regexCurso.test(linea)) {
        result.cursoDetectado = c;
        break;
      }
    }
    if (result.cursoDetectado) break;

    const matchCursoExplicit = linea.match(/(?:curso|materia|divisi[oó]n):\s*([^\n\r]+)/i);
    if (matchCursoExplicit) {
      const posibleCurso = matchCursoExplicit[1].trim().replace(/[#*`_]/g, '');
      const coincidencia = cursosDisponibles.find(c => c.toLowerCase() === posibleCurso.toLowerCase());
      if (coincidencia) {
        result.cursoDetectado = coincidencia;
        break;
      }
    }
  }

  // 2. Identificar bloques de días.
  // Un día se reconoce por encabezados de nivel 1, 2 o 3 con fecha, o encabezados que separen clases.
  interface SeccionRaw {
    lineaInicio: number;
    encabezado: string;
    lineasContenido: string[];
  }

  const secciones: SeccionRaw[] = [];
  let seccionActual: SeccionRaw | null = null;
  let esPrimerEncabezadoGlobal = true;

  // Regex para detectar encabezados de día:
  // - Encabezado Markdown #, ##, ###
  // - O divisores '---' seguidos inmediatamente por encabezado o fecha
  const regexHeader = /^(#{1,3})\s+(.*)$/;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const matchHeader = linea.match(regexHeader);

    if (matchHeader) {
      const headerText = matchHeader[2].trim();
      const infoFecha = normalizarFecha(headerText);

      // Si es el primer encabezado del archivo (# Planificación Anual) y NO tiene fecha, lo consideramos título global
      if (esPrimerEncabezadoGlobal && !infoFecha) {
        result.tituloDocumento = headerText;
        esPrimerEncabezadoGlobal = false;
        continue;
      }
      esPrimerEncabezadoGlobal = false;

      // Si encontramos una fecha en el encabezado, o palabras clave de día ("Clase", "Día", "Fecha")
      // o ya estamos dentro de un bloque y es un encabezado H1/H2
      const esHeaderDeDia = Boolean(infoFecha) ||
        /^(?:clase|d[ií]a|fecha|encuentro|sesi[oó]n)\b/i.test(headerText) ||
        matchHeader[1].length <= 2; // ## encabezados principales

      if (esHeaderDeDia) {
        if (seccionActual) {
          secciones.push(seccionActual);
        }
        seccionActual = {
          lineaInicio: i + 1,
          encabezado: headerText,
          lineasContenido: []
        };
        continue;
      }
    }

    if (seccionActual) {
      seccionActual.lineasContenido.push(linea);
    }
  }

  if (seccionActual) {
    secciones.push(seccionActual);
  }

  if (secciones.length === 0) {
    result.erroresGenerales.push(
      "No se encontraron secciones de días de clase. Cada día debe comenzar con un encabezado con fecha, por ejemplo: '## [2026-03-02] Diagnóstico Inicial'."
    );
    return result;
  }

  // 3. Procesar cada sección detectada
  const fechasVistas = new Set<string>();

  secciones.forEach((sec, idx) => {
    const infoFecha = normalizarFecha(sec.encabezado);
    const contenidoBruto = sec.lineasContenido.join('\n').trim();

    // Extraer título limpio (quitando la fecha y brackets del encabezado)
    let titulo = sec.encabezado;
    if (infoFecha) {
      titulo = titulo
        .replace(new RegExp(`\\[?\\s*${infoFecha.fechaOriginal}\\s*\\]?`, 'g'), '')
        .replace(/^[\s:\-\|\–—]+/, '')
        .replace(/[\s:\-\|\–—]+$/, '')
        .trim();
    }
    if (!titulo) {
      titulo = `Clase ${idx + 1}`;
    }

    const item: ParsedDayPlan = {
      id: `day-${idx}-${Date.now()}`,
      fecha: infoFecha ? infoFecha.fechaYmd : "",
      fechaOriginal: infoFecha ? infoFecha.fechaOriginal : "",
      titulo,
      planMd: "",
      lineaInicio: sec.lineaInicio,
      esValido: true,
      errores: [],
      advertencias: []
    };

    if (!infoFecha) {
      item.esValido = false;
      item.errores.push(
        `Falta la fecha en el encabezado '${sec.encabezado}'. Utiliza formato YYYY-MM-DD (ej: 2026-03-02) o DD/MM/YYYY (ej: 02/03/2026).`
      );
      item.planMd = contenidoBruto;
      result.diasConError.push(item);
      return;
    }

    // Validar fecha válida en calendario
    const partes = item.fecha.split('-').map(Number);
    const dObj = new Date(partes[0], partes[1] - 1, partes[2]);
    if (
      dObj.getFullYear() !== partes[0] ||
      dObj.getMonth() !== partes[1] - 1 ||
      dObj.getDate() !== partes[2]
    ) {
      item.esValido = false;
      item.errores.push(`La fecha '${item.fechaOriginal}' no existe en el calendario.`);
      result.diasConError.push(item);
      return;
    }

    // Advertencia de fecha duplicada en el mismo archivo
    if (fechasVistas.has(item.fecha)) {
      item.advertencias.push(`La fecha ${item.fecha} aparece más de una vez en este archivo. La última entrada sobrescribirá a la anterior.`);
    }
    fechasVistas.add(item.fecha);

    if (!contenidoBruto) {
      item.advertencias.push("Esta sección no tiene texto de planificación.");
    }

    // Extraer subsecciones de observaciones o hasta dónde llegamos si existen
    const { planLimpio, observaciones, hastaDonde } = extraerSeccionesEspeciales(contenidoBruto);

    // Si hay título descriptivo, anteponerlo como encabezado en la planificación si no está ya
    let planFinal = planLimpio;
    if (titulo && !planFinal.startsWith('#')) {
      planFinal = `## ${titulo}\n\n${planFinal}`;
    }

    item.planMd = planFinal.trim();
    item.observaciones = observaciones;
    item.hastaDonde = hastaDonde;

    result.diasValidos.push(item);
  });

  result.totalDias = result.diasValidos.length + result.diasConError.length;

  if (result.diasValidos.length === 0 && result.diasConError.length > 0) {
    result.erroresGenerales.push("Ningún día del archivo cuenta con una fecha válida reconocible.");
  }

  return result;
}

/**
 * Plantilla modelo descargable / copiable para los docentes
 */
export const PLANTILLA_MULTI_DIA_MD = `# Planificación Anual - Ciclo 2026
Curso: 35 TM

## [2026-03-02] Diagnóstico Inicial y Pautas de Convivencia
### 🎯 Objetivos
- Presentar el encuadre pedagógico y pautas de trabajo del ciclo lectivo.
- Evaluar saberes previos de magnitudes físicas y propiedades de la materia.

### ⏱️ Secuencia de Actividades
1. Dinámica de presentación grupal y lectura del contrato pedagógico.
2. Resolución individual y en parejas de la guía diagnóstica N° 1.
3. Puesta en común de los ejercicios 1 y 2 en el pizarrón.

### 📦 Recursos y Materiales
- Guía de ejercitación impresa, carpeta del alumno.

---

## [2026-03-04] Propiedades de la Materia y Estados de Agregación
### 🎯 Objetivos
- Identificar y diferenciar propiedades extensivas e intensivas.
- Reconocer los cambios de estado a escala macroscópica y molecular.

### ⏱️ Secuencia de Actividades
1. Repaso de las dudas de la guía diagnóstica.
2. Exposición dialogada con apoyo de simulaciones y experiencias sencillas.
3. Confección de cuadro comparativo en clase.

### Observaciones
Recordar a los estudiantes traer tabla periódica y calculadora para la siguiente semana.

---

## [2026-03-09] Sistemas Materiales y Métodos de Separación
### 🎯 Objetivos
- Clasificar sistemas homogéneos y heterogéneos.
- Diseñar métodos de separación para diversas fases.

### ⏱️ Secuencia de Actividades
1. Actividad práctica en grupos con arena, agua, sal y limaduras de hierro.
2. Registro de observaciones en informe de laboratorio.
3. Conclusiones y corrección grupal.
`;
