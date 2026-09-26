import { EscalaNotas, TipoActividad, PeriodoNotas, SugerenciaBimestralResultado } from '../types';

export const NOTAS_CONCEPTUALES = [
  "Pendiente",
  "No entregado",
  "Entregado",
  "Insuficiente",
  "En proceso",
  "Aprobado",
  "Notable",
  "Excelente"
] as const;

export const NOTAS_NUMERICAS = [
  "Pendiente",
  "Ausente",
  "No entregado",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
] as const;

export const NOTAS_BIMESTRALES = [
  "Pendiente",
  "EP",
  "S",
  "A"
] as const;

export const NOTAS_PRESENTISMO = [
  "Pendiente",
  "5 o menos ausentes",
  "5 o más ausentes"
] as const;

export const TIPOS_ACTIVIDAD: TipoActividad[] = [
  "Trabajo práctico",
  "Actividad teórico-práctica",
  "Prueba escrita",
  "Prueba oral",
  "Nota bimestral conceptual",
  "Nota cuatrimestral numérica",
  "Presentismo"
];

export const PERIODOS_NOTAS: PeriodoNotas[] = [
  "1° bimestre",
  "2° bimestre / 1° cuatrimestre",
  "3° bimestre",
  "4° bimestre / 2° cuatrimestre"
];

export function fmtFechaNotas(fecha: string | Date | undefined): string {
  if (!fecha) return "";
  const d = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function normalizarTexto(valor: string | number | null | undefined): string {
  return String(valor === null || typeof valor === "undefined" ? "" : valor)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function listaPorEscala(escala: EscalaNotas): readonly string[] {
  switch (escala) {
    case "CONCEPTUAL":
      return NOTAS_CONCEPTUALES;
    case "NUMERICA_1_10":
      return NOTAS_NUMERICAS;
    case "BIMESTRAL_EP_S_A":
      return NOTAS_BIMESTRALES;
    case "PRESENTISMO":
      return NOTAS_PRESENTISMO;
    default:
      return [];
  }
}

export function escalaPorTipoPeriodo(tipo: TipoActividad, periodo: PeriodoNotas): EscalaNotas | "" {
  if (tipo === "Trabajo práctico" || tipo === "Actividad teórico-práctica") return "CONCEPTUAL";
  if (tipo === "Prueba escrita" || tipo === "Prueba oral") return "NUMERICA_1_10";
  if (tipo === "Presentismo") return "PRESENTISMO";
  if (tipo === "Nota bimestral conceptual") {
    if (periodo === "1° bimestre" || periodo === "3° bimestre") return "BIMESTRAL_EP_S_A";
    return "";
  }
  if (tipo === "Nota cuatrimestral numérica") {
    if (periodo === "2° bimestre / 1° cuatrimestre" || periodo === "4° bimestre / 2° cuatrimestre") return "NUMERICA_1_10";
    return "";
  }
  return "";
}

export function normalizarNotaPorEscala(valor: unknown, escala: EscalaNotas): string {
  if (valor === "" || valor === null || typeof valor === "undefined") return "";
  const original = String(valor).trim();
  if (!original) return "";
  const txt = normalizarTexto(original);
  const lista = listaPorEscala(escala);
  let candidata = "";
  if (txt === "P" || txt.startsWith("PEND")) candidata = "Pendiente";
  else if (txt === "NE" || txt.includes("NO ENTREG")) candidata = "No entregado";
  else if (txt === "E" || txt.startsWith("ENTREG")) candidata = "Entregado";
  else if (txt === "AUS" || txt === "AUSENTE") {
    candidata = escala === "NUMERICA_1_10" ? "Ausente" : "No entregado";
  } else if (escala === "CONCEPTUAL") {
    if (txt.startsWith("INSUF")) candidata = "Insuficiente";
    else if (txt.includes("PROCESO")) candidata = "En proceso";
    else if (txt.startsWith("APROB")) candidata = "Aprobado";
    else if (txt.startsWith("NOTABLE")) candidata = "Notable";
    else if (txt.startsWith("EXCEL") || txt.startsWith("SOBRES")) candidata = "Excelente";
  } else if (escala === "NUMERICA_1_10") {
    const n = Number(original.replace(",", "."));
    if (!isNaN(n) && n >= 1 && n <= 10) {
      const rounded = Math.round(n * 100) / 100;
      if (Math.round(rounded * 4) === rounded * 4) {
        candidata = String(rounded).replace(".", ",");
      }
    }
  } else if (escala === "BIMESTRAL_EP_S_A") {
    if (txt === "EP" || txt === "S" || txt === "A") candidata = txt;
    else if (txt.includes("PROCESO")) candidata = "EP";
    else if (txt.startsWith("SUF") || txt.startsWith("APROB")) candidata = "S";
    else if (txt.startsWith("AVANZ") || txt.startsWith("EXCEL")) candidata = "A";
  } else if (escala === "PRESENTISMO") {
    if (txt.includes("MENOS") || txt === "OK" || txt === "BIEN") candidata = "5 o menos ausentes";
    else if (txt.includes("MAS")) candidata = "5 o más ausentes";
  }
  if (!candidata) return "";
  if (escala === "NUMERICA_1_10") return candidata;
  return lista.includes(candidata as any) ? candidata : "";
}

export function notaOrden(nota: string, escala: EscalaNotas): number | "" {
  if (!nota) return "";
  if (nota === "Pendiente") return 0;
  if (nota === "Entregado") return 0.5;
  if (nota === "No entregado" || nota === "Ausente") return -1;
  if (escala === "CONCEPTUAL") {
    if (nota === "Insuficiente") return 1;
    if (nota === "En proceso") return 2;
    if (nota === "Aprobado") return 3;
    if (nota === "Notable") return 4;
    if (nota === "Excelente") return 5;
    return "";
  }
  if (escala === "NUMERICA_1_10") {
    const n = Number(nota.replace(",", "."));
    return isNaN(n) ? "" : n;
  }
  if (escala === "BIMESTRAL_EP_S_A") {
    if (nota === "EP") return 1;
    if (nota === "S") return 2;
    if (nota === "A") return 3;
    return "";
  }
  if (escala === "PRESENTISMO") {
    if (nota === "5 o menos ausentes") return 1;
    if (nota === "5 o más ausentes") return 0;
    return "";
  }
  return "";
}

export const PESO_PRUEBAS_NOTAS = 0.70;
export const PESO_TP_NOTAS = 0.30;
export const TP_CONCEPTUAL_A_NUMERO: Record<string, number> = {
  "Insuficiente": 3, "En proceso": 4.5, "Aprobado": 6, "Notable": 8, "Excelente": 10
};
export const MAX_ADEUDADAS_SIN_TOPE = 1;

export interface ItemEvaluacionDetalle {
  tipo: TipoActividad; nombre: string; escala: EscalaNotas; nota: string; observacion?: string; fecha?: string;
}

export function sugerirNotaBimestral(detalle: ItemEvaluacionDetalle[], esBimestral: boolean): SugerenciaBimestralResultado {
  const tipoDe = (r: ItemEvaluacionDetalle) => String(r.tipo || "").trim();
  const notaDe = (r: ItemEvaluacionDetalle) => { const n = String(r.nota || "").trim(); return n === "Sin cargar" ? "" : n; };
  const presentismos = detalle.filter(r => tipoDe(r) === "Presentismo");
  const tpsYActividades = detalle.filter(r => tipoDe(r) === "Trabajo práctico" || tipoDe(r) === "Actividad teórico-práctica");
  const pruebas = detalle.filter(r => tipoDe(r) === "Prueba escrita" || tipoDe(r) === "Prueba oral");
  const notasTp = tpsYActividades.map(notaDe);
  const notasPruebas = pruebas.map(notaDe);
  const adeudadas = tpsYActividades.filter(r => { const n = notaDe(r); return n === "" || n === "Pendiente" || n === "No entregado"; });
  const nAdeudadas = adeudadas.length;
  const detalleAdeuda = nAdeudadas > 0 ? ` Adeuda ${nAdeudadas} actividad/es: ${adeudadas.map(r => r.nombre).join(", ")}.` : "";
  const aBimestral = (num: number) => (num < 6 ? "EP" : (num < 7.5 ? "S" : "A"));
  const aNumerica = (num: number) => { let x = Math.round(num * 4) / 4; if (x < 1) x = 1; if (x > 10) x = 10; return String(x).replace(".", ","); };
  const salida = (num: number) => esBimestral ? aBimestral(num) : aNumerica(num);
  const numPruebas = notasPruebas.map(n => Number(n.replace(",", "."))).filter(n => !isNaN(n) && n >= 1 && n <= 10);
  const promPruebas = numPruebas.length > 0 ? numPruebas.reduce((a, b) => a + b, 0) / numPruebas.length : null;
  const numTp = notasTp.map(n => TP_CONCEPTUAL_A_NUMERO[n]).filter((n): n is number => typeof n === "number");
  const promTp = numTp.length > 0 ? numTp.reduce((a, b) => a + b, 0) / numTp.length : null;
  const hayPruebas = pruebas.length > 0;
  if (hayPruebas && promPruebas === null) {
    return { nota: esBimestral ? "EP" : "1", razon: `El alumno no rindió ${pruebas.length === 1 ? "la prueba" : "ninguna de las pruebas"} del período (las pruebas no se pueden omitir). ${esBimestral ? "Corresponde EP." : "Corresponde nota 1."}${detalleAdeuda}` };
  }
  if (presentismos.some(r => notaDe(r) === "5 o más ausentes")) {
    return { nota: esBimestral ? "EP" : "5", razon: `El alumno registra 5 o más ausentes en el período. ${esBimestral ? "Corresponde EP." : "Corresponde nota 5."}${detalleAdeuda}` };
  }
  if (promPruebas === null && promTp === null) {
    return { nota: "", razon: `No hay pruebas ni actividades calificadas en el período para generar una sugerencia.${detalleAdeuda}` };
  }
  let notaNum: number; let detallePeso: string;
  if (promPruebas !== null && promTp !== null) {
    notaNum = PESO_PRUEBAS_NOTAS * promPruebas + PESO_TP_NOTAS * promTp;
    detallePeso = `promedio ponderado 70% pruebas (${promPruebas.toFixed(2)}) + 30% actividades (${promTp.toFixed(2)}) = ${notaNum.toFixed(2)}`;
  } else if (promPruebas !== null) {
    notaNum = promPruebas; detallePeso = `promedio de pruebas ${promPruebas.toFixed(2)} (sin actividades calificadas)`;
  } else {
    notaNum = promTp!; detallePeso = `promedio de actividades ${promTp!.toFixed(2)} (aún no hay pruebas en el período)`;
  }
  notaNum = Math.round(notaNum * 100) / 100;
  if (nAdeudadas > MAX_ADEUDADAS_SIN_TOPE) {
    const topado = Math.min(notaNum, 5);
    const nota = esBimestral ? "EP" : aNumerica(topado);
    return { nota, razon: `El ${detallePeso} daría ${salida(notaNum)}, pero adeuda ${nAdeudadas} actividades (2 o más), por lo que corresponde 5 o menos.${detalleAdeuda} ${esBimestral ? "Corresponde EP." : `Corresponde nota ${nota}.`}` };
  }
  const nota = salida(notaNum);
  return { nota, razon: `El ${detallePeso}.${detalleAdeuda} ${esBimestral ? `Corresponde ${nota}.` : `Corresponde nota ${nota}.`}` };
}

export function convertirPuntajeFormsAConceptual(valor: unknown): string {
  if (valor === "" || valor === null || typeof valor === "undefined") return "";
  const n = Number(String(valor).replace(",", "."));
  if (isNaN(n) || n < 0 || n > 100) return "";
  if (n <= 30) return "Insuficiente";
  if (n <= 59) return "En proceso";
  if (n <= 74) return "Aprobado";
  if (n <= 84) return "Notable";
  return "Excelente";
}

export function obtenerBadgeEstiloNota(nota: string): { bg: string; text: string; border: string } {
  if (!nota || nota === "Sin cargar") return { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" };
  if (nota === "Pendiente") return { bg: "bg-neutral-200", text: "text-neutral-700", border: "border-neutral-300" };
  if (nota === "Entregado") return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  const numNota = Number(nota.replace(",", "."));
  if (!isNaN(numNota)) {
    if (numNota < 6) return { bg: "bg-rose-100", text: "text-rose-800 font-semibold", border: "border-rose-200" };
    if (numNota < 7) return { bg: "bg-amber-100", text: "text-amber-800 font-semibold", border: "border-amber-200" };
    if (numNota < 8) return { bg: "bg-yellow-100", text: "text-yellow-800 font-semibold", border: "border-yellow-300" };
    if (numNota < 10) return { bg: "bg-emerald-100", text: "text-emerald-800 font-semibold", border: "border-emerald-300" };
    return { bg: "bg-teal-100", text: "text-teal-900 font-bold", border: "border-teal-300" };
  }
  if (["No entregado", "Ausente", "Insuficiente", "EP", "5 o más ausentes"].includes(nota)) return { bg: "bg-rose-100", text: "text-rose-800 font-semibold", border: "border-rose-200" };
  if (["En proceso"].includes(nota)) return { bg: "bg-amber-100", text: "text-amber-800 font-semibold", border: "border-amber-200" };
  if (["Aprobado", "S"].includes(nota)) return { bg: "bg-yellow-100", text: "text-yellow-800 font-semibold", border: "border-yellow-300" };
  if (["Notable", "5 o menos ausentes"].includes(nota)) return { bg: "bg-emerald-100", text: "text-emerald-800 font-semibold", border: "border-emerald-300" };
  if (["Excelente", "A"].includes(nota)) return { bg: "bg-teal-100", text: "text-teal-900 font-bold", border: "border-teal-300" };
  return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" };
}
