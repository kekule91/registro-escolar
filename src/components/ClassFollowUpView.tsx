import React, { useState, useEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import { useSchool } from '../context/SchoolContext';
import { Alumno, EstadoPresentismo, RegistroAsistencia } from '../types';
import {
  obtenerDiasClaseAnual,
  buscarDiaClaseAnterior,
  buscarDiaClaseSiguiente,
  buscarCarryOverAnterior,
  agruparAsistenciaDia,
  keySeguimiento,
  DiaClaseInfo
} from '../utils/followUpEngine';
import {
  fmtFecha,
  keyAsistencia,
  nombreDia
} from '../utils/attendanceEngine';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  Users,
  CheckCheck,
  UserCheck,
  UserX,
  Clock,
  Printer,
  Trash2,
  HelpCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { MultiDayPlanImportModal } from './MultiDayPlanImportModal';

interface ClassFollowUpViewProps {
  onNavigateToAttendance?: () => void;
}

export const ClassFollowUpView: React.FC<ClassFollowUpViewProps> = ({
  onNavigateToAttendance
}) => {
  const {
    cursos,
    selectedCurso,
    setSelectedCurso,
    alumnos,
    bimestres,
    diasNoClase,
    asistencias,
    seguimientos,
    upsertSeguimiento,
    borrarSeguimiento,
    upsertAsistencias,
    lastSaved
  } = useSchool();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentCursoObj = useMemo(() => {
    return cursos.find(c => c.curso === selectedCurso) || cursos[0];
  }, [cursos, selectedCurso]);

  // Generate all scheduled class dates for the current course
  const diasClase = useMemo(() => {
    if (!currentCursoObj) return [];
    return obtenerDiasClaseAnual(currentCursoObj, bimestres, diasNoClase);
  }, [currentCursoObj, bimestres, diasNoClase]);

  // Determine initial selected date
  const [selectedFecha, setSelectedFecha] = useState<string>(() => {
    const today = new Date();
    const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // If today is in diasClase, use today
    const foundToday = diasClase.find(d => d.ymd === todayYmd);
    if (foundToday) return foundToday.ymd;
    // Or if there is a class day <= today, choose the closest one
    const pastOrToday = diasClase.filter(d => d.ymd <= todayYmd);
    if (pastOrToday.length > 0) return pastOrToday[pastOrToday.length - 1].ymd;
    // Otherwise the first class day
    return diasClase.length > 0 ? diasClase[0].ymd : "2026-03-02";
  });

  // When course changes, if the date doesn't belong to this course's class days, pick closest
  useEffect(() => {
    if (diasClase.length === 0) return;
    const exists = diasClase.some(d => d.ymd === selectedFecha);
    if (!exists) {
      const today = new Date();
      const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const pastOrToday = diasClase.filter(d => d.ymd <= todayYmd);
      if (pastOrToday.length > 0) {
        setSelectedFecha(pastOrToday[pastOrToday.length - 1].ymd);
      } else {
        setSelectedFecha(diasClase[0].ymd);
      }
    }
  }, [diasClase, selectedCurso]);

  // Current class day info
  const diaActualInfo = useMemo<DiaClaseInfo | undefined>(() => {
    return diasClase.find(d => d.ymd === selectedFecha);
  }, [diasClase, selectedFecha]);

  // Adjacent days
  const diaAnterior = useMemo(() => {
    return buscarDiaClaseAnterior(selectedFecha, diasClase);
  }, [selectedFecha, diasClase]);

  const diaSiguiente = useMemo(() => {
    return buscarDiaClaseSiguiente(selectedFecha, diasClase);
  }, [selectedFecha, diasClase]);

  // Carry over text from the previous class with recorded progress
  const carryOver = useMemo(() => {
    return buscarCarryOverAnterior(selectedCurso, selectedFecha, seguimientos, diasClase);
  }, [selectedCurso, selectedFecha, seguimientos, diasClase]);

  // Active students of the course
  const courseStudents = useMemo(() => {
    return alumnos
      .filter(a => a.curso === selectedCurso && a.activo)
      .sort((a, b) => a.numero - b.numero);
  }, [alumnos, selectedCurso]);

  // Attendance summary for this day
  const resumenAsistencia = useMemo(() => {
    const bloques = diaActualInfo?.bloques || (currentCursoObj ? currentCursoObj.bloques.split('|').map(b => b.trim()) : []);
    return agruparAsistenciaDia(selectedCurso, selectedFecha, courseStudents, asistencias, bloques);
  }, [selectedCurso, selectedFecha, courseStudents, asistencias, diaActualInfo, currentCursoObj]);

  // Current seguimiento document
  const claveActual = keySeguimiento(selectedCurso, selectedFecha);
  const seguimientoActual = seguimientos[claveActual];

  // Local form states
  const [planMd, setPlanMd] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [hastaDonde, setHastaDonde] = useState<string>("");
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [saveIndicator, setSaveIndicator] = useState<string>("Guardado");
  const [isMultiDayModalOpen, setIsMultiDayModalOpen] = useState<boolean>(false);
  const [importNotification, setImportNotification] = useState<{ curso: string; fecha: string; total: number } | null>(null);

  // Keep local states in sync when course or date changes
  useEffect(() => {
    const s = seguimientos[claveActual];
    setPlanMd(s?.planMd || "");
    setObservaciones(s?.observaciones || "");
    setHastaDonde(s?.hastaDonde || "");
    setSaveIndicator("Listo");
  }, [claveActual, seguimientos]);

  // Auto-save debounce timer
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = seguimientos[claveActual];
      const hasChanged =
        (planMd !== (s?.planMd || "")) ||
        (observaciones !== (s?.observaciones || "")) ||
        (hastaDonde !== (s?.hastaDonde || ""));

      if (hasChanged) {
        setSaveIndicator("Guardando...");
        upsertSeguimiento({
          curso: selectedCurso,
          fecha: selectedFecha,
          planMd,
          observaciones,
          hastaDonde
        });
        setSaveIndicator("Guardado");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [planMd, observaciones, hastaDonde, claveActual, selectedCurso, selectedFecha, seguimientos, upsertSeguimiento]);

  // Manual save
  const handleGuardarManual = () => {
    upsertSeguimiento({
      curso: selectedCurso,
      fecha: selectedFecha,
      planMd,
      observaciones,
      hastaDonde
    });
    setSaveIndicator("Guardado ahora");
  };

  // Upload markdown/text file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        setPlanMd(content);
        upsertSeguimiento({
          curso: selectedCurso,
          fecha: selectedFecha,
          planMd: content,
          observaciones,
          hastaDonde
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Insert standard markdown template
  const handleInsertarPlantilla = () => {
    const plantilla = `## Planificación de Clase

### 🎯 Objetivos de Aprendizaje
- Comprender los conceptos fundamentales de la temática.
- Resolver situaciones problemáticas aplicando el marco teórico.

### 📚 Contenidos & Ejes Temáticos
- Unidad / Tema: 
- Conceptos clave:

### ⏱️ Secuencia de Actividades
1. **Inicio (15 min):** Indagación de ideas previas y repaso de la clase anterior.
2. **Desarrollo (45 min):** Exposición dialogada, lectura guiada y resolución de actividades grupales.
3. **Cierre (20 min):** Puesta en común de conclusiones y aclaración de dudas.

### 📦 Recursos & Materiales
- Pizarra, carpeta del alumno, guía de ejercitación.
`;
    setPlanMd(prev => (prev.trim() ? prev + "\n\n" + plantilla : plantilla));
  };

  // Insert markdown helpers
  const handleInsertSnippet = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("plan-md-editor") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = planMd.substring(start, end);
    const newText = planMd.substring(0, start) + prefix + (selectedText || "texto") + suffix + planMd.substring(end);
    setPlanMd(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText || "texto").length);
    }, 0);
  };

  // Quick light-edit attendance for single student
  const handleCycleAlumnoAsistencia = (alumno: Alumno) => {
    const bloque = diaActualInfo?.bloques[0] || "1";
    const key = keyAsistencia(selectedCurso, alumno.numero, selectedFecha, bloque);
    const estadoActual = asistencias[key]?.estado || "";

    const ciclo: EstadoPresentismo[] = ["", "P", "A", "T", "J"];
    const nextIndex = (ciclo.indexOf(estadoActual) + 1) % ciclo.length;
    const nextEstado = ciclo[nextIndex];

    const registro: RegistroAsistencia = {
      clave: key,
      curso: selectedCurso,
      numero: alumno.numero,
      alumno: alumno.alumno,
      fecha: selectedFecha,
      dia: diaActualInfo?.diaNombre || nombreDia(new Date(selectedFecha)),
      mes: `${selectedFecha.split('-')[0]}-${selectedFecha.split('-')[1]}`,
      bimestre: "Bimestre",
      bloque,
      estado: nextEstado,
      actualizado: new Date().toISOString()
    };

    upsertAsistencias([registro]);
  };

  // Mark all students present for this date
  const handleMarcarTodosPresentes = () => {
    const bloque = diaActualInfo?.bloques[0] || "1";
    const ahora = new Date().toISOString();
    const diaNombre = diaActualInfo?.diaNombre || nombreDia(new Date(selectedFecha));

    const registros: RegistroAsistencia[] = courseStudents.map(st => ({
      clave: keyAsistencia(selectedCurso, st.numero, selectedFecha, bloque),
      curso: selectedCurso,
      numero: st.numero,
      alumno: st.alumno,
      fecha: selectedFecha,
      dia: diaNombre,
      mes: `${selectedFecha.split('-')[0]}-${selectedFecha.split('-')[1]}`,
      bimestre: "Bimestre",
      bloque,
      estado: "P",
      actualizado: ahora
    }));

    upsertAsistencias(registros);
  };

  // Jump to next class day with carry over prefilled
  const handleIrSiguienteClase = () => {
    if (!diaSiguiente) return;
    // Save current before navigating
    upsertSeguimiento({
      curso: selectedCurso,
      fecha: selectedFecha,
      planMd,
      observaciones,
      hastaDonde
    });
    setSelectedFecha(diaSiguiente.ymd);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Jump to previous class day
  const handleIrAnteriorClase = () => {
    if (!diaAnterior) return;
    upsertSeguimiento({
      curso: selectedCurso,
      fecha: selectedFecha,
      planMd,
      observaciones,
      hastaDonde
    });
    setSelectedFecha(diaAnterior.ymd);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Print class sheet
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Import Notification Banner */}
      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 bg-emerald-200 text-emerald-800 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold">¡Planificación importada con éxito!</strong> Se cargaron o actualizaron{" "}
              <strong>{importNotification.total}</strong> sesiones para el curso{" "}
              <strong>{importNotification.curso}</strong>. Navegando a la primera clase:{" "}
              <span className="font-mono underline font-semibold">{fmtFecha(importNotification.fecha)}</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 hover:bg-emerald-100 rounded text-sm transition-colors"
            title="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Course & Date Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Seguimiento de Clase
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-700">Curso:</span>
              {/* Quick Course Switcher */}
              <div className="inline-flex items-center gap-1">
                {cursos.map(c => {
                  const active = c.curso === selectedCurso;
                  return (
                    <button
                      key={c.curso}
                      onClick={() => setSelectedCurso(c.curso)}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c.curso}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Horario habitual: <strong className="text-slate-700 font-semibold">{currentCursoObj?.bloques.replace(/\|/g, " • ")}</strong>
              </span>
              {diaActualInfo ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Día oficial de clase ({diaActualInfo.bloques.join(", ")})
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Fecha fuera de horario habitual
                </span>
              )}
            </div>
          </div>

          {/* Date Selector & Day Navigation Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Multi-Day Import Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMultiDayModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all hover:shadow-md"
              title="Cargar o pegar archivo Markdown para múltiples fechas del curso"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cargar planificación (varios días)</span>
            </button>
            {/* Prev Day Button */}
            <button
              onClick={handleIrAnteriorClase}
              disabled={!diaAnterior}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                diaAnterior
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={diaAnterior ? `Ir a la clase anterior (${diaAnterior.header})` : "No hay clase oficial anterior"}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Clase anterior</span>
            </button>

            {/* Quick dropdown for official class dates */}
            <div className="relative">
              <select
                id="select-dias-clase"
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 font-medium max-w-[200px] sm:max-w-[240px] truncate"
              >
                {diasClase.map(d => (
                  <option key={d.ymd} value={d.ymd}>
                    {d.header}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Date Input Picker */}
            <input
              type="date"
              id="fecha-picker"
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-1.5 font-medium"
              title="Seleccionar cualquier fecha"
            />

            {/* Next Day Button */}
            <button
              onClick={handleIrSiguienteClase}
              disabled={!diaSiguiente}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                diaSiguiente
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={diaSiguiente ? `Ir a la siguiente clase (${diaSiguiente.header})` : "No hay clase oficial siguiente"}
            >
              <span className="hidden sm:inline">Siguiente clase</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Print button */}
            <button
              onClick={handleImprimir}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CARRY-OVER BANNER (Continuamos desde...) */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                {carryOver ? `Continuamos desde la clase del ${fmtFecha(carryOver.fecha)}:` : "Continuamos desde:"}
              </h2>
            </div>

            {carryOver ? (
              <div className="bg-white/80 border border-amber-200/80 rounded-lg p-3 text-sm text-slate-800 font-medium leading-relaxed">
                <p className="italic text-slate-900">“{carryOver.hastaDonde}”</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-amber-800">
                  <span>Registrado en el día anterior.</span>
                  <button
                    onClick={() => setSelectedFecha(carryOver.fecha)}
                    className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 underline font-semibold"
                  >
                    Ver o editar la clase anterior ({fmtFecha(carryOver.fecha)})
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/60 border border-amber-100 rounded-lg p-3 text-xs text-slate-500 italic">
                Primera clase del ciclo lectivo o no se ha registrado aún el avance de una clase previa para este curso.
              </div>
            )}
          </div>

          {diaSiguiente && (
            <div className="sm:self-center shrink-0">
              <button
                onClick={handleIrSiguienteClase}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-all"
                title={`Avanzar a la clase del ${diaSiguiente.header}`}
              >
                <span>Siguiente clase: {diaSiguiente.header}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Planificación & Observaciones (Left) + Asistencia & Hasta Dónde (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Planificación en Markdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Planificación */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Plan Header & Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Planificación de la Clase</h3>
                <span className="text-xs text-slate-400 font-mono">
                  ({planMd.trim().split(/\s+/).filter(Boolean).length} palabras)
                </span>
              </div>

              {/* View Mode & Actions Toolbar */}
              <div className="flex items-center flex-wrap gap-1.5 print:hidden">
                {/* File Upload hidden input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".md,.txt,.markdown"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="upload-plan-file"
                />

                <button
                  type="button"
                  onClick={() => setIsMultiDayModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                  title="Cargar o pegar planificación Markdown para varios días escolares"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cargar varios días</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors"
                  title="Subir archivo .md o .txt para el día actual"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Subir .md (este día)</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsertarPlantilla}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                  title="Insertar plantilla base estructurada"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Plantilla</span>
                </button>

                {/* View Mode Toggle */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/80 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('editor')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      viewMode === 'editor' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-2 py-1 rounded font-medium transition-colors hidden sm:inline-flex items-center ${
                      viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Columns className="w-3 h-3 inline mr-1" />
                    Dividido
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      viewMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    Vista previa
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Markdown Formatting Helper bar */}
            {viewMode !== 'preview' && (
              <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200 flex items-center flex-wrap gap-1 text-xs text-slate-600 print:hidden">
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("## ", "")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 font-bold"
                  title="Título H2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("### ", "")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 font-semibold"
                  title="Subtítulo H3"
                >
                  H3
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("**", "**")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 font-bold"
                  title="Negrita"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("*", "*")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 italic"
                  title="Cursiva"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("- ", "")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50"
                  title="Lista con viñetas"
                >
                  • Lista
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("- [ ] ", "")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50"
                  title="Lista de tareas / casillas"
                >
                  ☑ Tarea
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("> ", "")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50"
                  title="Cita"
                >
                  " Cita
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet("`", "`")}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 font-mono text-[11px]"
                  title="Código en línea"
                >
                  &lt;/&gt;
                </button>
              </div>
            )}

            {/* Editor & Preview Area */}
            <div className="p-4">
              <div
                className={`grid gap-4 ${
                  viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {/* Editor Textarea */}
                {viewMode !== 'preview' && (
                  <div className="space-y-1">
                    <label htmlFor="plan-md-editor" className="sr-only">
                      Contenido de la planificación en Markdown
                    </label>
                    <textarea
                      id="plan-md-editor"
                      rows={14}
                      value={planMd}
                      onChange={(e) => setPlanMd(e.target.value)}
                      placeholder="Pega o escribe aquí la planificación de la clase en formato Markdown...&#10;&#10;Ejemplo:&#10;## Unidad 2: Soluciones&#10;- Objetivo: Distinguir soluto y solvente.&#10;- Actividad: Lectura comprensiva página 34 y experimento grupal."
                      className="w-full font-mono text-xs sm:text-sm text-slate-800 bg-slate-50/50 border border-slate-300 rounded-lg p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y leading-relaxed"
                    />
                  </div>
                )}

                {/* Preview Box */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div
                    className={`border border-slate-200 rounded-lg p-4 bg-white min-h-[300px] overflow-y-auto max-h-[500px] ${
                      viewMode === 'split' ? 'bg-slate-50/20' : ''
                    }`}
                  >
                    {planMd.trim() ? (
                      <div className="markdown-body">
                        <Markdown>{planMd}</Markdown>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p>No hay contenido en la planificación aún.</p>
                        <p className="text-[11px] mt-1 text-slate-400">
                          Escribe en el editor o sube un archivo Markdown para visualizar la vista previa formateada.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Observaciones del Día */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">Observaciones del Día</h3>
              </div>
              <span className="text-xs text-slate-400">
                {observaciones.length} caracteres
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Notas libres sobre lo ocurrido en el aula: dinámica de grupo, incidentes, alumnos destacados, materiales solicitados o pautas para la siguiente jornada.
            </p>
            <textarea
              id="observaciones-dia"
              rows={4}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Grupo muy participativo en el laboratorio. Quedó pendiente solicitar que traigan calculadora científica y regla para el próximo martes..."
              className="w-full text-xs sm:text-sm text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y leading-relaxed"
            />
          </div>
        </div>

        {/* Right Column: Hasta Dónde Llegamos & Asistencia del Día */}
        <div className="space-y-6">
          {/* Card: HASTA DÓNDE LLEGAMOS (Carry-over source for next day) */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/90 rounded-xl border border-indigo-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <h3 className="text-sm font-bold text-indigo-950">Hasta dónde llegamos hoy</h3>
            </div>
            <p className="text-xs text-indigo-900/80 leading-relaxed">
              Campo breve de registro. <strong>Se mostrará automáticamente en la siguiente clase</strong> de este curso como <em>“Continuamos desde: …”</em>
            </p>

            <div className="space-y-2">
              <textarea
                id="hasta-donde-input"
                rows={3}
                value={hastaDonde}
                onChange={(e) => setHastaDonde(e.target.value)}
                placeholder="Ej: Llegamos hasta el ítem 3 de la guía de la página 45; quedó pendiente la puesta en común."
                className="w-full text-xs sm:text-sm font-medium text-slate-900 bg-white border border-indigo-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-2xs leading-relaxed"
              />
            </div>

            {diaSiguiente && (
              <div className="pt-2 border-t border-indigo-200/60">
                <button
                  type="button"
                  onClick={handleIrSiguienteClase}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-xs transition-colors"
                >
                  <span>Pasar a la siguiente clase ({diaSiguiente.header})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Card: Asistencia del Día */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Asistencia del Día</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {resumenAsistencia.totales.totalAlumnos} alumnos
              </span>
            </div>

            {/* Attendance Stat Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                <div className="text-base font-bold text-emerald-800">
                  {resumenAsistencia.totales.P}
                </div>
                <div className="text-[11px] font-medium text-emerald-600">Presentes (P)</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2">
                <div className="text-base font-bold text-rose-800">
                  {resumenAsistencia.totales.A}
                </div>
                <div className="text-[11px] font-medium text-rose-600">Ausentes (A)</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <div className="text-base font-bold text-slate-700">
                  {resumenAsistencia.totales.T + resumenAsistencia.totales.J + resumenAsistencia.totales.R}
                </div>
                <div className="text-[11px] font-medium text-slate-500">Otros (T/J/R)</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={handleMarcarTodosPresentes}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded transition-colors"
                title="Marcar a todos los alumnos como Presente para este día"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Marcar todos P</span>
              </button>

              {onNavigateToAttendance && (
                <button
                  type="button"
                  onClick={onNavigateToAttendance}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 underline"
                  title="Abrir planilla completa de asistencia"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ver planilla completa</span>
                </button>
              )}
            </div>

            {/* List of Ausentes (highlighted for quick teacher awareness) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
                <span className="flex items-center gap-1">
                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                  Ausentes ({resumenAsistencia.ausentes.length})
                </span>
              </div>
              {resumenAsistencia.ausentes.length > 0 ? (
                <div className="bg-rose-50/60 border border-rose-200/80 rounded-lg p-2 max-h-36 overflow-y-auto divide-y divide-rose-100">
                  {resumenAsistencia.ausentes.map(al => (
                    <div
                      key={al.numero}
                      className="py-1 px-1 flex items-center justify-between text-xs hover:bg-rose-100/50 rounded"
                    >
                      <span className="font-medium text-slate-800">
                        <strong className="font-mono mr-1.5 text-rose-700">#{al.numero}</strong>
                        {al.alumno}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCycleAlumnoAsistencia(al)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 hover:bg-rose-300"
                        title="Hacer clic para cambiar estado (A -> T -> J -> P)"
                      >
                        A
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 bg-slate-50 rounded-lg p-2 text-center italic">
                  No hay alumnos ausentes registrados hoy.
                </div>
              )}
            </div>

            {/* List of Presentes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Presentes ({resumenAsistencia.presentes.length})
                </span>
              </div>
              {resumenAsistencia.presentes.length > 0 ? (
                <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-lg p-2 max-h-40 overflow-y-auto divide-y divide-emerald-100">
                  {resumenAsistencia.presentes.map(al => (
                    <div
                      key={al.numero}
                      className="py-1 px-1 flex items-center justify-between text-xs hover:bg-emerald-100/50 rounded"
                    >
                      <span className="font-medium text-slate-800">
                        <strong className="font-mono mr-1.5 text-emerald-700">#{al.numero}</strong>
                        {al.alumno}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCycleAlumnoAsistencia(al)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 hover:bg-emerald-300"
                        title="Hacer clic para cambiar estado (P -> A)"
                      >
                        P
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 bg-slate-50 rounded-lg p-2 text-center italic">
                  Aún no se ha cargado presentismo para este día.
                </div>
              )}
            </div>

            {/* Sin cargar (if any) */}
            {resumenAsistencia.sinCargar.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                  <span>Sin cargar ({resumenAsistencia.sinCargar.length})</span>
                </div>
                <div className="text-[11px] text-slate-500 bg-slate-50 rounded-md p-1.5">
                  {resumenAsistencia.sinCargar.slice(0, 5).map(a => `#${a.numero} ${a.alumno}`).join(", ")}
                  {resumenAsistencia.sinCargar.length > 5 && ` y ${resumenAsistencia.sinCargar.length - 5} más...`}
                </div>
              </div>
            )}
          </div>

          {/* Save Status & Delete Button */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex items-center justify-between text-xs print:hidden">
            <div className="flex items-center space-x-1.5 text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{saveIndicator}</span>
              {seguimientoActual?.actualizado && (
                <span className="text-[11px] text-slate-400">
                  • {new Date(seguimientoActual.actualizado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGuardarManual}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-2.5 py-1 rounded-md text-xs transition-colors"
              >
                Guardar
              </button>

              {seguimientoActual && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors"
                  title="Borrar seguimiento de este día"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Confirm Delete Seguimiento */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900">¿Borrar seguimiento de este día?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se eliminará la planificación, observaciones y el registro de avance para el curso <strong>{selectedCurso}</strong> en la fecha <strong>{fmtFecha(selectedFecha)}</strong>. Los datos de asistencia permanecerán intactos.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  borrarSeguimiento(selectedCurso, selectedFecha);
                  setPlanMd("");
                  setObservaciones("");
                  setHastaDonde("");
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Multi-Day Plan Import */}
      <MultiDayPlanImportModal
        isOpen={isMultiDayModalOpen}
        onClose={() => setIsMultiDayModalOpen(false)}
        initialCurso={selectedCurso}
        onImportSuccess={(curso, primerFecha, totalImportados) => {
          setSelectedCurso(curso);
          setSelectedFecha(primerFecha);
          setImportNotification({
            curso,
            fecha: primerFecha,
            total: totalImportados
          });
        }}
      />
    </div>
  );
};
