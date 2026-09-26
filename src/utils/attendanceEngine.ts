import { Curso, SesionCurso, DiaNoClase, EstadoPresentismo } from '../types';

export const ESTADOS_PRESENTISMO: EstadoPresentismo[] = ["P", "A", "T", "R", "J", "N/C"];

export const INFO_ESTADOS_PRESENTISMO: Record<EstadoPresentismo, { label: string; desc: string; bg: string; text: string; border: string }> = {
  "P": { label: "P", desc: "Presente", bg: "bg-emerald-100", text: "text-emerald-800 font-bold", border: "border-emerald-300" },
  "A": { label: "A", desc: "Ausente", bg: "bg-rose-100", text: "text-rose-800 font-bold", border: "border-rose-300" },
  "T": { label: "T", desc: "Tarde", bg: "bg-amber-100", text: "text-amber-800 font-bold", border: "border-amber-300" },
  "R": { label: "R", desc: "Se retiró", bg: "bg-orange-100", text: "text-orange-800 font-bold", border: "border-orange-300" },
  "J": { label: "J", desc: "Justificada", bg: "bg-sky-100", text: "text-sky-800 font-bold", border: "border-sky-300" },
  "N/C": { label: "N/C", desc: "No corresponde / Feriado", bg: "bg-slate-200", text: "text-slate-600 font-medium", border: "border-slate-300" },
  "": { label: "·", desc: "Sin cargar", bg: "bg-white", text: "text-slate-300", border: "border-slate-200" }
};

export function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseYmd(str: string): Date {
  const parts = str.trim().split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(str);
}

export function fmtFecha(d: Date | string): string {
  const date = typeof d === 'string' ? parseYmd(d) : d;
  if (isNaN(date.getTime())) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function fmtFechaCorta(d: Date): string {
  const nombres = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return `${nombres[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

export function nombreDia(d: Date): string {
  const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return nombres[d.getDay()];
}

export function diaCodFecha(d: Date): string {
  const codigos = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
  return codigos[d.getDay()];
}

export function normalizarDiaCod(texto: string): string {
  const t = texto.trim().toUpperCase();
  if (t.startsWith("LUN")) return "LUN";
  if (t.startsWith("MAR")) return "MAR";
  if (t.startsWith("MIE")) return "MIE";
  if (t.startsWith("JUE")) return "JUE";
  if (t.startsWith("VIE")) return "VIE";
  if (t.startsWith("SAB")) return "SAB";
  if (t.startsWith("DOM")) return "DOM";
  return t.substring(0, 3);
}

export function extraBloqueVisible(bloque: string): string {
  const txt = bloque.trim();
  if (txt.length <= 3) return "";
  return txt.substring(3).trim();
}

export function keyAsistencia(curso: string, numero: number, fechaYmd: string, bloque: string): string {
  return `${curso.trim()}|${numero}|${fechaYmd.trim()}|${bloque.trim()}`;
}

export function normalizarEstadoPresentismo(valor: unknown): EstadoPresentismo {
  let e = String(valor || "").trim().toUpperCase();
  if (e === "NC") e = "N/C";
  if (["P", "A", "T", "R", "J", "N/C"].includes(e)) {
    return e as EstadoPresentismo;
  }
  return "";
}

export function generarSesionesCursoRango(
  curso: Curso,
  inicioStr: string,
  finStr: string,
  diasNoClase: DiaNoClase[]
): SesionCurso[] {
  const setNoClase = new Set(diasNoClase.map(d => d.fecha));
  const bloques = String(curso.bloques || "")
    .split("|")
    .map(b => b.trim())
    .filter(Boolean);

  const sesiones: SesionCurso[] = [];
  const d = parseYmd(inicioStr);
  const end = parseYmd(finStr);

  const current = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  while (current <= end) {
    const fechaYmd = ymd(current);

    if (!setNoClase.has(fechaYmd)) {
      bloques.forEach((bloque, orden) => {
        const cod = normalizarDiaCod(bloque);
        if (diaCodFecha(current) === cod) {
          const extra = extraBloqueVisible(bloque);
          sesiones.push({
            fecha: new Date(current),
            ymd: fechaYmd,
            dia: nombreDia(current),
            bloque,
            orden,
            header: `${fmtFechaCorta(current)}${extra ? " " + extra : ""}`
          });
        }
      });
    }

    current.setDate(current.getDate() + 1);
  }

  sesiones.sort((a, b) => {
    const cmp = a.fecha.getTime() - b.fecha.getTime();
    if (cmp !== 0) return cmp;
    return a.orden - b.orden;
  });

  return sesiones;
}
