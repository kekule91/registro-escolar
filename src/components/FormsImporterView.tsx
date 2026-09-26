import React, { useState, useMemo } from 'react';
import { useSchool } from '../context/SchoolContext';
import {
  convertirPuntajeFormsAConceptual,
  obtenerBadgeEstiloNota
} from '../utils/gradeEngine';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export const FormsImporterView: React.FC = () => {
  const {
    selectedCurso,
    actividades,
    alumnos,
    importarNotasForms
  } = useSchool();

  // Only conceptual activities are eligible for Forms 0-100 conceptual conversion
  const eligibleActivities = useMemo(() => {
    return actividades.filter(a => a.curso === selectedCurso && a.activa && a.escala === "CONCEPVUAL");
  }, [actividades, selectedCurso]);

  const [selectedActivityId, setSelectedActivityId] = useState<string>(() => {
    return eligibleActivities.length > 0 ? eligibleActivities[0].id : "";
  });

  const activeActivity = useMemo(() => {
    const found = eligibleActivities.find(a => a.id === selectedActivityId);
    if (found) return found;
    return eligibleActivities.length > 0 ? eligibleActivities[0] : null;
  }, [eligibleActivities, selectedActivityId]);

  const [rawText, setRawText] = useState<string>("");
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const courseStudents = useMemo(() => {
    return alumnos.filter(a => a.curso === selectedCurso && a.activo);
  }, [alumnos, selectedCurso]);

  // Parse raw text into structured preview rows
  const parsedRows = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    return lines.map((line, idx) => {
      // Split by tab, semicolon or comma if nomicos
      let parts = line.split('\t');
      if (parts.length === 1 && line.includes(',')) {
        parts = line.split(',');
      }

      parts = parts.map(p => p.trim());

      let numeroCandidate: number | undefined;
      let nombreCandidate = "";
      let puntajeCandidate = "";
      let obsCandidate = "";

      if (parts.length >= 3) {
        // [N°, Alumno, Puntaje, Obs] or [Alumno, Puntaje, Obs]
        const firstAsNum = Number(parts[0]);
        if (!isNaN(firstAsNum) && firstAsNum > 0 && firstAsNum <= 100 && parts[1] && isNaN(Number(parts[1]))) {
          numeroCandidate = firstAsNum;
          nombreCandidate = parts[1];
          puntajeCandidate = parts[2];
          obsCandidate = parts[3] || "";
        } else {
          nombreCandidate = parts[0];
          puntajeCandidate = parts[1];
          obsCandidate = parts[2] || "";
        }
      } else if (parts.length === 2) {
        nombreCandidate = parts[0];
        puntajeCandidate = parts[1];
      } else {
        nombreCandidate = parts[0];
      }

      // Match student
      let matchedStudent = courseStudents.find(s => numeroCandidate && s.numero === numeroCandidate);
      if (!matchedStudent && nombreCandidate) {
        const nomUpper = nombreCandidate.toUpperCase();
        matchedStudent = courseStudents.find(s => {
          const sUpper = s.alumno.toUpperCase();
          return sUpper === nomUpper || sUpper.includes(nomUpper) || nomUpper.includes(sUpper);
        });
      }

      const notaConvertida = convertirPuntajeFormsAConceptual(puntajeCandidate);

      return {
        originalLine: line,
        numero: matchedStudent ? matchedStudent.numero : numeroCandidate,
        nombre: nombreCandidate,
        matchedAlumno: matchedStudent ? matchedStudent.alumno : null,
        puntaje: puntajeCandidate,
        notaConvertida,
        observacion: obsCandidate,
        valido: !!matchedStudent && !!notaConvertida
      };
    });
  }, [rawText, courseStudents]);

  const handleImport = () => {
    if (!activeActivity) {
      setResultMsg({ type: 'error', text: "Por favor selecciona una actividad conceptual de destino." });
      return;
    }

    const payload = parsedRows
      .filter(r => r.valido)
      .map(r => ({
        numero: r.numero,
        nombre: r.nombre,
        puntaje: r.puntaje,
        obs: r.observacion
      }));

    if (payload.length === 0) {
      setResultMsg({ type: 'error', text: "No hay registros válidos con alumno reconocido y puntaje entre 0 y 100." });
      return;
    }

    const result = importarNotasForms(selectedCurso, activeActivity.id, payload);
    setResultMsg({
      type: 'success',
      text: `✓ Importación completada: ${result.procesados} notas guardadas en "${activeActivity.nombre}". (Duplicados omitidos: ${result.duplicados}, Alumnos nomencontrados: ${result.noEncontrados}).`
    });
    setRawText("");
  };

  return (
    <div className="space-y-6">
      {/* Header and Scale guide */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Importador de Notas desde Google Forms</span>
            </h2>
            <p className="text-xs text-slate-500">
              Convierte automáticamente puntajes de Google Forms (0 a 100) a la escala conceptual oficial.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="target-activity-select" className="text-xs font-semibold text-slate-600 uppercase">Actividad destino:</label>
            {eligibleActivities.length > 0 ? (
              <select
                id="target-activity-select"
                value={activeActivity?.id || ""}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 font-bold"
              >
                {eligibleActivities.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.periodo})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-rose-600 font-medium">No hay actividades conceptuales activas en {selectedCurso}.</span>
            )}
          </div>
        </div>

        {/* Conversion Scale Table */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wider">
            Escala oficial de conversión (0 a 100 → Conceptual):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="block font-bold text-rose-800">0 a 30</span>
              <span className="text-xs font-semibold text-rose-900">Insuficiente</span>
            </div>
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="block font-bold text-amber-800">31 a 59</span>
              <span className="text-xs font-semibold text-amber-900">En proceso</span>
            </div>
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="block font-bold text-yellow-800">60 a 74</span>
              <span className="text-xs font-semibold text-yellow-900">Aprobado</span>
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="block font-bold text-emerald-800">75 a 84</span>
              <span className="text-xs font-semibold text-emerald-900">Notable</span>
            </div>
            <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg">
              <span className="block font-bold text-teal-800">85 a 100</span>
              <span className="text-xs font-semibold text-teal-900">Excelente</span>
            </div>
          </div>
        </div>
      </div>

      {resultMsg && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
          resultMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {resultMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{resultMsg.text}</span>
        </div>
      )}

      {/* Paste Area and Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Textarea */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="forms-raw-textarea" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Pega los datos de la planilla de Google Forms:
            </label>
            <span className="text-[11px] text-slate-400">Filas o columnas copiadas</span>
          </div>

          <textarea
            id="forms-raw-textarea"
            rows={10}
            placeholder={`Pega aquí los datos copiados desde la hoja de respuestas de Forms.\nFormatos soportados por línea:\n1\tGarcía Demo Ana\t88\tBuen trabajo\nPérez Ejemplo Luis\t76\nLópez Muestra Sofía\t92\tEntregó a tiempo`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full font-monomiext-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
          />

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-500 font-medium">
              Líneas detectadas: <strong>{parsedRows.length}</strong> ({parsedRows.filter(r => r.valido).length} válidas)
            </span>

            <button
              onClick={handleImport}
              disabled={!activeActivity || parsedRows.filter(r => r.valido).length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Importar Calificaciones</span>
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            2. Vista Previa de Reconocimiento y Conversión:
          </span>

          <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-100 rounded-lg">
            {parsedRows.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Pega contenido en el panel izquierdo para previsualizar el emparejamiento con la nómina de alumnos.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-2 text-left">Alumno Detectado</th>
                    <th className="py-2 px-2 text-center w-16">Puntos</th>
                    <th className="py-2 px-2 text-center w-28">Nota</th>
                    <th className="py-2 px-2 text-center w-16">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100ssName="text-xs fsn]">
            {r, i)(s => {
        {
          consbrBad =
  obtenerBadgeEstiloNo(: r.notaConvertie();
        ;
          retur();
        ;
            <on keyi}iv className> r.vali   ?0 hover:bg-slate-'   : 'bg-rose-/40'id}>
                        dth className="p1.5-2 px-s font-mediu0 text-slate-9"d}>
                          .  matchedAlum 0 ? (
            >
              <spa  .  matchedAlum}s: <stroh2 className="text-slate-40l font-monomiex[1300p">(N°   .r.nume})h}</stron00</span>
            >
            ) : (
            >
              <span className="text-rose-600 font-semibo">❌ N nomencontra: "{rty.nombre00</span>
            >
           }}>
                       /tdd}>
                        dth className="p1.5-2 px-2 text-centel font-mon="font-bold text-slate-7"d}>
                          .y puntajd ||—"}}>
                       /tdd}>
                        dth className="p1.5-2 px-2 text-cent"d}>
                          .t notaConvertid? : (
            >
              <span classNam{`="inlin="bloc2 px-="p0.p-5 roundemdum border"font-bold text-[11px${brBad.bg}x${brBad.g.texx${brBad.b bord  }`}>
                              .t notaConverti} (
            >
             0</span>
            >
            ) : (
            >
              <span className="text-rose-50s italld text-[11p16">Puntajins váli00</span>
            >
           }}>
                       /tdd}>
                        dth className="p1.5-2 px-2 text-cent"d}>
                          .r.vali   : (
            >
              <span className="texg-emerald-60r"font-bold text-xs `�L Vio 0</span>
            >
            ) : (
            >
              <span className="text-rose-50r"font-bold text-xsIgnorar00</span>
            >
           }}>
                       /tdd}>
                      </tr>
                   ();
        ;
      } }}>
                <<tbo />
             / <taban>
            )}
          </div>
        </div        </div      </div   ()};
