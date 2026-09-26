import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  OpcionPeriodoInforme,
  obtenerRangoFechasPeriodo,
  resumenPendientesCurso,
  calcularPendientesAlumno,
  generarTextoFamiliaPendientes,
  generarMailInformePendientes,
  descargarCSVExcel,
  TIPOS_ACTIVIDAD_INFORME,
  esTipoActividadEvaluable
} from '../../utils/informes';
import { fmtFecha, parseYmd } from '../../utils/attendanceEngine';
import {
  FileText,
  Users,
  CheckCircle2,
  AlertTriangle,
  ClockAlert,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Check,
  Download,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  AlertCircle,
  Mail,
  Send,
  Edit2,
  X
} from 'lucide-react';

export const PendingReportsSection: React.FC = () => {
  const {
    cursos,
    selectedCurso,
    setSelectedCurso,
    alumnos,
    actividades,
    notas,
    bimestres,
    editarAlumno
  } = useSchool();

  // Filtros comunes
  const [cursoFiltro, setCursoFiltro] = useState<string>(selectedCurso);
  const [periodoFiltro, setPeriodoFiltro] = useState<OpcionPeriodoInforme>('1° bimestre');
  const [tipoInforme, setTipoInforme] = useState<'curso' | 'individual'>('curso');

  // Fechas personalizadas
  const [customDesde, setCustomDesde] = useState<string>('2026-03-02');
  const [customHasta, setCustomHasta] = useState<string>('2026-05-07');

  // Estado para desplegables de alumnos en la tabla de actividades
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  // Alumno seleccionado para informe individual
  const [selectedStudentNum, setSelectedStudentNum] = useState<number>(1);

  // Texto sugerido personalizado por alumno
  const [customFamilyText, setCustomFamilyText] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Estado para copia de texto de email y modal de edición rápida de correo
  const [copiedMailText, setCopiedMailText] = useState<boolean>(false);
  const [showQuickEmailModal, setShowQuickEmailModal] = useState<boolean>(false);
  const [quickEmailInput, setQuickEmailInput] = useState<string>('');
  const [quickEmailError, setQuickEmailError] = useState<string | null>(null);

  // Modo impresión masiva
  const [isBatchPrinting, setIsBatchPrinting] = useState<boolean>(false);

  // Rango de fechas del período seleccionado
  const rangoFechas = useMemo(() => {
    return obtenerRangoFechasPeriodo(periodoFiltro, bimestres, customDesde, customHasta);
  }, [periodoFiltro, bimestres, customDesde, customHasta]);

  // Si cursoFiltro es 'Todos' y el usuario pasa a 'individual', asegurar un curso específico
  const effectiveCourseForIndividual = cursoFiltro === 'Todos' ? (cursos[0]?.curso || '35 TM') : cursoFiltro;

  // Alumnos activos del curso
  const alumnosActivos = useMemo(() => {
    if (cursoFiltro === 'Todos' && tipoInforme === 'curso') {
      return alumnos.filter(a => a.activo);
    }
    const targetCurso = tipoInforme === 'individual' ? effectiveCourseForIndividual : cursoFiltro;
    return alumnos
      .filter(a => a.curso === targetCurso && a.activo)
      .sort((a, b) => a.numero - b.numero);
  }, [alumnos, cursoFiltro, tipoInforme, effectiveCourseForIndividual]);

  // Actividades filtradas por curso, período y tipos evaluables
  const actividadesFiltradas = useMemo(() => {
    return actividades.filter(a => {
      if (!a.activa) return false;
      if (!esTipoActividadEvaluable(a.tipo)) return false;

      // Filtro de curso
      if (cursoFiltro !== 'Todos' && a.curso !== cursoFiltro) {
        return false;
      }

      // Filtro de período
      if (periodoFiltro === 'Todo el año') {
        return true;
      } else if (periodoFiltro === 'Personalizado') {
        if (!a.fecha) return false;
        return a.fecha >= rangoFechas.inicio && a.fecha <= rangoFechas.fin;
      } else {
        // Coincide por nombre de período o por fecha dentro del rango del bimestre
        return a.periodo === periodoFiltro || (a.fecha && a.fecha >= rangoFechas.inicio && a.fecha <= rangoFechas.fin);
      }
    });
  }, [actividades, cursoFiltro, periodoFiltro, rangoFechas]);

  // Resumen del curso
  const resumenCursoData = useMemo(() => {
    return resumenPendientesCurso(
      cursoFiltro,
      alumnosActivos,
      actividadesFiltradas,
      notas
    );
  }, [cursoFiltro, alumnosActivos, actividadesFiltradas, notas]);

  // Alumno actual para informe individual
  const currentStudent = useMemo(() => {
    const found = alumnosActivos.find(a => a.numero === selectedStudentNum);
    return found || alumnosActivos[0] || null;
  }, [alumnosActivos, selectedStudentNum]);

  // Resumen individual del alumno actual
  const resumenIndividual = useMemo(() => {
    if (!currentStudent) return null;
    const studentActs = actividadesFiltradas.filter(a => a.curso === currentStudent.curso);
    return calcularPendientesAlumno(currentStudent, studentActs, notas);
  }, [currentStudent, actividadesFiltradas, notas]);

  // Actualizar texto para familia cuando cambia el alumno o el período
  React.useEffect(() => {
    if (resumenIndividual && currentStudent) {
      const txt = generarTextoFamiliaPendientes(
        currentStudent.alumno,
        rangoFechas.nombre,
        resumenIndividual.nombresPendientes
      );
      setCustomFamilyText(txt);
    }
  }, [resumenIndividual, currentStudent, rangoFechas.nombre]);

  // Navegación anterior / siguiente de alumnos
  const handlePrevStudent = () => {
    if (alumnosActivos.length === 0 || !currentStudent) return;
    const idx = alumnosActivos.findIndex(a => a.numero === currentStudent.numero);
    if (idx > 0) {
      setSelectedStudentNum(alumnosActivos[idx - 1].numero);
    } else {
      setSelectedStudentNum(alumnosActivos[alumnosActivos.length - 1].numero);
    }
  };

  const handleNextStudent = () => {
    if (alumnosActivos.length === 0 || !currentStudent) return;
    const idx = alumnosActivos.findIndex(a => a.numero === currentStudent.numero);
    if (idx < alumnosActivos.length - 1) {
      setSelectedStudentNum(alumnosActivos[idx + 1].numero);
    } else {
      setSelectedStudentNum(alumnosActivos[0].numero);
    }
  };

  // Toggle dropdown de actividad
  const toggleActivityDropdown = (actId: string) => {
    setExpandedActivities(prev => ({
      ...prev,
      [actId]: !prev[actId]
    }));
  };

  const fechaHoyStr = fmtFecha(new Date());

  // Datos estructurados para enviar el informe por correo (mailto)
  const datosMail = useMemo(() => {
    if (!currentStudent || !resumenIndividual) return null;
    return generarMailInformePendientes(
      currentStudent,
      rangoFechas.nombre,
      resumenIndividual,
      fechaHoyStr
    );
  }, [currentStudent, resumenIndividual, rangoFechas.nombre, fechaHoyStr]);

  // Copiar texto para familia
  const handleCopyFamilyText = () => {
    navigator.clipboard.writeText(customFamilyText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Copiar el texto completo del mail
  const handleCopyMailText = () => {
    if (!datosMail) return;
    navigator.clipboard.writeText(datosMail.cuerpo);
    setCopiedMailText(true);
    setTimeout(() => setCopiedMailText(false), 2500);
  };

  // Guardar rápido el email del alumno desde el informe
  const handleSaveQuickEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;
    const trimmed = quickEmailInput.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setQuickEmailError("El formato del correo electrónico no es válido (ej: nombre@dominio.com).");
      return;
    }
    editarAlumno(currentStudent.curso, currentStudent.numero, { email: trimmed });
    setShowQuickEmailModal(false);
    setQuickEmailError(null);
  };

  // Imprimir informe individual actual
  const handlePrintIndividual = () => {
    setIsBatchPrinting(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Imprimir todos los individuales del curso
  const handlePrintBatch = () => {
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Exportar CSV de informe por curso
  const handleExportCSV = () => {
    // 1. Resumen por Alumno
    const headersAlumnos = [
      'N°',
      'Alumno',
      'Email',
      'Curso',
      'Total_Actividades',
      'Pendientes',
      'Ausentes_Prueba',
      'Entregadas',
      'Cumplimiento_%',
      'Semaforo',
      'Actividades_Adeudadas'
    ];

    const rowsAlumnos = resumenCursoData.porAlumno.map(a => [
      a.alumno.numero,
      a.alumno.alumno,
      a.alumno.email || '',
      a.curso,
      a.totalActividades,
      a.totalPendientes,
      a.totalAusentesPrueba,
      a.totalEntregadas,
      `${a.porcentajeCumplimiento}%`,
      a.semaforo.toUpperCase(),
      a.nombresPendientes.join(', ')
    ]);

    descargarCSVExcel(
      `Trabajos_Pendientes_${cursoFiltro.replace(/\s+/g, '_')}_${periodoFiltro.replace(/\s+/g, '_')}`,
      headersAlumnos,
      rowsAlumnos
    );
  };

  return (
    <div className="space-y-6">
      {/* BARRA DE FILTROS COMUNES */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Selector de Curso */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Curso:
            </label>
            <select
              value={cursoFiltro}
              onChange={(e) => {
                setCursoFiltro(e.target.value);
                if (e.target.value !== 'Todos') {
                  setSelectedCurso(e.target.value);
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Todos">Todos los cursos</option>
              {cursos.map(c => (
                <option key={c.curso} value={c.curso}>{c.curso}</option>
              ))}
            </select>
          </div>

          {/* Selector de Período */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Período:
            </label>
            <select
              value={periodoFiltro}
              onChange={(e) => setPeriodoFiltro(e.target.value as OpcionPeriodoInforme)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1° bimestre">1° bimestre</option>
              <option value="2° bimestre / 1° cuatrimestre">2° bimestre / 1° cuatrimestre</option>
              <option value="3° bimestre">3° bimestre</option>
              <option value="4° bimestre / 2° cuatrimestre">4° bimestre / 2° cuatrimestre</option>
              <option value="Todo el año">Todo el año (Ciclo 2026)</option>
              <option value="Personalizado">Rango personalizado...</option>
            </select>
          </div>

          {/* Fechas personalizadas si aplica */}
          {periodoFiltro === 'Personalizado' ? (
            <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex items-center space-x-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Desde:</label>
                <input
                  type="date"
                  value={customDesde}
                  onChange={(e) => setCustomDesde(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hasta:</label>
                <input
                  type="date"
                  value={customHasta}
                  onChange={(e) => setCustomHasta(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 font-mono"
                />
              </div>
            </div>
          ) : (
            <div>
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Vigencia:
              </span>
              <div className="bg-slate-100 text-slate-700 text-xs rounded-lg p-2.5 font-mono truncate">
                {fmtFecha(rangoFechas.inicio)} al {fmtFecha(rangoFechas.fin)}
              </div>
            </div>
          )}

          {/* Tipo de Informe: Por Curso / Individual */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tipo de informe:
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTipoInforme('curso')}
                className={`py-1.5 px-3 text-xs font-bold rounded-md transition-all ${
                  tipoInforme === 'curso'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por curso
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoInforme('individual');
                  if (cursoFiltro === 'Todos') {
                    setCursoFiltro(cursos[0]?.curso || '35 TM');
                  }
                }}
                className={`py-1.5 px-3 text-xs font-bold rounded-md transition-all ${
                  tipoInforme === 'individual'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Individual
              </button>
            </div>
          </div>
        </div>

        {/* Selector de alumno si es informe individual */}
        {tipoInforme === 'individual' && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <label htmlFor="student-picker" className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Seleccionar Alumno:
              </label>
              <select
                id="student-picker"
                value={selectedStudentNum}
                onChange={(e) => setSelectedStudentNum(Number(e.target.value))}
                className="bg-white border border-blue-300 text-slate-900 text-xs rounded-lg p-2 font-bold focus:ring-2 focus:ring-blue-500"
              >
                {alumnosActivos.map(al => (
                  <option key={al.numero} value={al.numero}>
                    N° {al.numero} - {al.alumno}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevStudent}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                title="Alumno anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <span className="text-xs font-bold text-slate-500 px-1">
                {currentStudent ? `Alumno ${currentStudent.numero} de ${alumnosActivos.length}` : ''}
              </span>
              <button
                onClick={handleNextStudent}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                title="Alumno siguiente"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COMPROBACIÓN DE DATOS VACÍOS */}
      {actividadesFiltradas.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-amber-900 space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold">No hay actividades evaluables registradas en este período</h3>
          <p className="text-xs text-amber-700 max-w-lg mx-auto">
            El curso <strong>{cursoFiltro}</strong> no registra actividades de tipo <em>Trabajo práctico, Actividad teórico-práctica, Prueba escrita u oral</em> activas en el período seleccionado (<strong>{rangoFechas.nombre}</strong>).
          </p>
        </div>
      ) : alumnosActivos.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-amber-900 space-y-3">
          <Users className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold">No hay alumnos activos en este curso</h3>
          <p className="text-xs text-amber-700">Verifica la pestaña de Alumnos para dar de alta estudiantes en el curso {cursoFiltro}.</p>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* MODO 1: INFORME POR CURSO                                */}
          {/* ======================================================== */}
          {tipoInforme === 'curso' && (
            <div className="space-y-6">
              {/* Acciones superiores de exportación */}
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="text-xs text-slate-500">
                  Mostrando resumen consolidado de <strong>{cursoFiltro}</strong> para <strong>{rangoFechas.nombre}</strong>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Exportar CSV (Excel)</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir / Guardar PDF</span>
                  </button>
                </div>
              </div>

              {/* Encabezado formal solo para impresión */}
              <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
                <h1 className="text-xl font-black text-slate-900 uppercase">
                  Informe de Trabajos Pendientes y Evaluaciones
                </h1>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span><strong>Curso:</strong> {cursoFiltro}</span>
                  <span><strong>Período:</strong> {rangoFechas.nombre}</span>
                  <span><strong>Generado el:</strong> {fechaHoyStr}</span>
                </div>
              </div>

              {/* 1. RESUMEN EN TARJETAS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Alumnos</span>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{resumenCursoData.totalAlumnos}</p>
                  <span className="text-[10px] text-slate-400">Activos en nómina</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Actividades</span>
                  <p className="text-xl font-black text-blue-600 mt-0.5">{resumenCursoData.totalActividades}</p>
                  <span className="text-[10px] text-slate-400">TPs y exámenes</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Entregas Esperadas</span>
                  <p className="text-xl font-black text-slate-700 mt-0.5">{resumenCursoData.entregasEsperadas}</p>
                  <span className="text-[10px] text-slate-400">Alumnos × Actividades</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Entregas Realizadas</span>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{resumenCursoData.entregasRealizadas}</p>
                  <span className="text-[10px] text-slate-400">Calificadas / entregadas</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Pendientes</span>
                  <p className="text-xl font-black text-rose-600 mt-0.5">
                    {resumenCursoData.totalPendientes}
                    {resumenCursoData.totalAusentesPrueba > 0 && (
                      <span className="text-xs font-normal text-rose-500 ml-1">
                        (+{resumenCursoData.totalAusentesPrueba} aus.)
                      </span>
                    )}
                  </p>
                  <span className="text-[10px] text-slate-400">Sin entregar / adeudadas</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cumplimiento</span>
                  <p className="text-xl font-black text-indigo-600 mt-0.5">{resumenCursoData.porcentajeCumplimiento}%</p>
                  <span className="text-[10px] text-slate-400">Promedio general</span>
                </div>
              </div>

              {/* 4. GRÁFICO DE BARRAS INTERACTIVO DE PENDIENTES POR ACTIVIDAD */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                    <ClockAlert className="w-4 h-4 text-amber-500" />
                    <span>Gráfico: Cantidad de Entregas Pendientes por Actividad</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Orden de calendario</span>
                </div>

                <div className="space-y-2.5 pt-2">
                  {resumenCursoData.porActividad.map(actData => {
                    const maxAlumnos = Math.max(1, resumenCursoData.totalAlumnos);
                    const pctPendiente = Math.min(100, Math.round((actData.totalPendientes / maxAlumnos) * 100));
                    const esCero = actData.totalPendientes === 0;

                    return (
                      <div key={actData.actividad.id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 truncate max-w-[65%]">
                            {actData.actividad.nombre}{' '}
                            <span className="text-[10px] font-normal text-slate-400">({actData.actividad.tipo})</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {actData.totalPendientes} pendientes{' '}
                            <span className="text-[10px] text-slate-400">({100 - actData.porcentajeEntregado}% adeudado)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-300 ${
                              esCero ? 'bg-emerald-500' : pctPendiente > 30 ? 'bg-rose-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.max(4, pctPendiente)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. TABLA POR ACTIVIDAD (con desplegable de alumnos que la adeudan) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Detalle de Cumplimiento por Actividad
                  </h3>
                  <span className="text-xs text-slate-400">
                    Haz clic en una actividad para ver los alumnos deudores
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                      <tr>
                        <th className="py-3 px-4 min-w-[200px]">Actividad</th>
                        <th className="py-3 px-3 min-w-[140px]">Tipo</th>
                        <th className="py-3 px-3 min-w-[100px]">Fecha</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">Pendientes</th>
                        <th className="py-3 px-3 text-center min-w-[110px]">% Entregado</th>
                        <th className="py-3 px-4 text-right min-w-[140px]">Alumnos Deudores</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {resumenCursoData.porActividad.map(item => {
                        const isExpanded = expandedActivities[item.actividad.id];
                        const tieneDeudores = item.totalPendientes > 0;

                        return (
                          <React.Fragment key={item.actividad.id}>
                            <tr
                              onClick={() => tieneDeudores && toggleActivityDropdown(item.actividad.id)}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                tieneDeudores ? 'cursor-pointer' : ''
                              }`}
                            >
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {item.actividad.nombre}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                                  {item.actividad.tipo}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-500">
                                {item.actividad.fecha ? fmtFecha(item.actividad.fecha) : '—'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full font-bold text-xs ${
                                    item.totalPendientes === 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.totalPendientes > 3
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.totalPendientes}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold font-mono">
                                <span
                                  className={
                                    item.porcentajeEntregado >= 85
                                      ? 'text-emerald-700'
                                      : item.porcentajeEntregado >= 70
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                  }
                                >
                                  {item.porcentajeEntregado}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {tieneDeudores ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleActivityDropdown(item.actividad.id);
                                    }}
                                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                  >
                                    <span>{item.alumnosDeudores.length} alumnos</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 font-medium text-[11px] flex items-center justify-end space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Completo</span>
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Desplegable con lista de alumnos que adeudan la actividad */}
                            {isExpanded && tieneDeudores && (
                              <tr className="bg-amber-50/40">
                                <td colSpan={6} className="py-3 px-6">
                                  <div className="border-l-2 border-amber-400 pl-3 space-y-1">
                                    <span className="text-[11px] font-bold text-amber-900 block mb-1">
                                      Estudiantes que adeudan esta actividad ({item.alumnosDeudores.length}):
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {item.alumnosDeudores.map((d, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-white px-2.5 py-1.5 rounded-md border border-amber-200 text-xs flex justify-between items-center"
                                        >
                                          <span className="font-semibold text-slate-800">
                                            N° {d.alumno.numero} - {d.alumno.alumno}
                                          </span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                            {d.tipoDeuda}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. TABLA POR ALUMNO (ordenada de más a menos pendientes con semáforo) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Ranking de Cumplimiento por Alumno
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ordenado de mayor a menor cantidad de actividades adeudadas.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Al día (0)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                      <span>Atención (1-2)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <span>Crítico (3+)</span>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">N°</th>
                        <th className="py-3 px-4 min-w-[180px]">Alumno</th>
                        <th className="py-3 px-3 min-w-[150px]">Email</th>
                        {cursoFiltro === 'Todos' && <th className="py-3 px-3">Curso</th>}
                        <th className="py-3 px-3 text-center w-24">Pendientes</th>
                        <th className="py-3 px-3 text-center w-28">% Cumplimiento</th>
                        <th className="py-3 px-4 min-w-[280px]">Actividades Adeudadas</th>
                        <th className="py-3 px-3 text-center w-24">Semáforo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {resumenCursoData.porAlumno.map(item => {
                        const totalDeuda = item.totalPendientes + item.totalAusentesPrueba;

                        return (
                          <tr key={`${item.curso}-${item.alumno.numero}`} className="hover:bg-slate-50/80">
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                              {item.alumno.numero}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {item.alumno.alumno}
                            </td>
                            <td className="py-3 px-3">
                              {item.alumno.email ? (
                                <a
                                  href={`mailto:${item.alumno.email}`}
                                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline font-mono text-[11px]"
                                  title={`Enviar correo a ${item.alumno.email}`}
                                >
                                  <Mail className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="truncate max-w-[130px]">{item.alumno.email}</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Sin email</span>
                              )}
                            </td>
                            {cursoFiltro === 'Todos' && (
                              <td className="py-3 px-3 text-slate-600 font-medium">
                                {item.curso}
                              </td>
                            )}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs ${
                                  totalDeuda === 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : totalDeuda <= 2
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {totalDeuda}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold font-mono">
                              {item.porcentajeCumplimiento}%
                            </td>
                            <td className="py-3 px-4">
                              {item.nombresPendientes.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.nombresPendientes.map((nom, i) => (
                                    <span
                                      key={i}
                                      className="inline-block px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[10px] font-medium"
                                    >
                                      {nom}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-600 font-medium text-[11px] flex items-center space-x-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Sin tareas adeudadas</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.semaforo === 'verde'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.semaforo === 'amarillo'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {item.semaforo === 'verde'
                                  ? 'Verde'
                                  : item.semaforo === 'amarillo'
                                  ? 'Amarillo'
                                  : 'Rojo'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODO 2: INFORME INDIVIDUAL                               */}
          {/* ======================================================== */}
          {tipoInforme === 'individual' && currentStudent && resumenIndividual && (
            <div className="space-y-6">
              {/* Botones de acción individual */}
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="text-xs text-slate-500">
                  Informe individual para el legajo del estudiante y comunicación con la familia
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Botón de Enviar por Mail (mailto:) */}
                  {currentStudent.email ? (
                    <a
                      href={datosMail?.mailtoUrl}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                      title={`Abrir cliente de correo para enviar informe a ${currentStudent.email}`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Enviar informe por mail</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-75"
                      title="Para enviar por mail, registre la dirección de correo del alumno con el botón 'Cargar email'"
                    >
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>Enviar por mail (sin email)</span>
                    </button>
                  )}

                  {/* Botón de Copiar Texto del Mail */}
                  <button
                    type="button"
                    onClick={handleCopyMailText}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
                    title="Copia al portapapeles el texto formal completo del correo listo para enviar"
                  >
                    {copiedMailText ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">¡Mail copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copiar texto del mail</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrintBatch}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
                    title="Genera un PDF con un alumno por página para todo el curso"
                  >
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Imprimir todos los individuales</span>
                  </button>
                  <button
                    onClick={handlePrintIndividual}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              {/* CONTENEDOR IMPRIMIBLE DEL ALUMNO ACTUAL */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 individual-report-card">
                {/* Encabezado formal */}
                <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase block">
                      Registro Escolar 2026 • Informe Académico Individual
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-0.5">
                      {currentStudent.alumno}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                      <span><strong>Curso:</strong> {currentStudent.curso}</span>
                      <span>•</span>
                      <span><strong>N° de orden:</strong> {currentStudent.numero}</span>
                      <span>•</span>
                      <span><strong>Período:</strong> {rangoFechas.nombre}</span>
                      <span>•</span>
                      <span className="inline-flex items-center space-x-1.5">
                        <strong>Email:</strong>
                        {currentStudent.email ? (
                          <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {currentStudent.email}
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 italic">
                            Sin email
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setQuickEmailInput(currentStudent.email || '');
                            setQuickEmailError(null);
                            setShowQuickEmailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-[11px] font-medium underline print:hidden ml-1 cursor-pointer"
                          title="Cargar o modificar la dirección de correo electrónico del estudiante"
                        >
                          {currentStudent.email ? 'Editar email' : 'Cargar email'}
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      Fecha de emisión
                    </span>
                    <span className="text-xs font-bold text-slate-700">{fechaHoyStr}</span>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          resumenIndividual.semaforo === 'verde'
                            ? 'bg-emerald-100 text-emerald-800'
                            : resumenIndividual.semaforo === 'amarillo'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Estado: {resumenIndividual.semaforo === 'verde' ? 'Al día' : resumenIndividual.semaforo === 'amarillo' ? 'Alerta moderada' : 'Atención prioritaria'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas resumidas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Actividades</span>
                    <p className="text-lg font-bold text-slate-800">{resumenIndividual.totalActividades}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Entregadas / Aprobadas</span>
                    <p className="text-lg font-bold text-emerald-700">{resumenIndividual.totalEntregadas}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Adeudadas</span>
                    <p className="text-lg font-bold text-rose-700">
                      {resumenIndividual.totalPendientes + resumenIndividual.totalAusentesPrueba}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">% Cumplimiento</span>
                    <p className="text-lg font-bold text-indigo-700">{resumenIndividual.porcentajeCumplimiento}%</p>
                  </div>
                </div>

                {/* Tabla de Actividades del Alumno */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Detalle de Trabajos Prácticos y Evaluaciones
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                        <tr>
                          <th className="py-2.5 px-3">Actividad</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3 text-center">Estado</th>
                          <th className="py-2.5 px-3 text-center">Nota</th>
                          <th className="py-2.5 px-3">Observación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {resumenIndividual.actividadesEvaluadas.map((item, idx) => {
                          const badgeColor =
                            item.estadoEtiqueta === 'Entregado'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : item.estadoEtiqueta === 'Ausente (a recuperar)'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : item.estadoEtiqueta === 'No entregado'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200';

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {item.nombreActividad}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                {item.tipo}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                                {item.fecha ? fmtFecha(item.fecha) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${badgeColor}`}>
                                  {item.estadoEtiqueta}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                {item.nota}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                {item.observacion || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TEXTO SUGERIDO EDITABLE PARA LA FAMILIA */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 print:border-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Nota / Mensaje para la Familia (Editable)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyFamilyText}
                      className="print:hidden inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar texto</span>
                        </>
                      )}
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={customFamilyText}
                    onChange={(e) => setCustomFamilyText(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Escribe aquí un mensaje para la familia..."
                  />
                  <span className="text-[10px] text-slate-400 block print:hidden">
                    💡 Puedes editar el mensaje directamente y presionar "Copiar texto" para pegarlo en WhatsApp o enviarlo por cuaderno de comunicaciones.
                  </span>
                </div>

                {/* PREPARACIÓN Y ENVÍO DEL INFORME POR CORREO ELECTRÓNICO */}
                {datosMail && (
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3 print:hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Envío del Informe por Correo Electrónico
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {currentStudent.email ? (
                          <a
                            href={datosMail.mailtoUrl}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors"
                            title={`Abrir cliente de correo para enviar a ${currentStudent.email}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar informe por mail</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickEmailInput('');
                              setQuickEmailError(null);
                              setShowQuickEmailModal(true);
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-bold transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Asignar correo al alumno</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleCopyMailText}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold transition-colors"
                          title="Copia el asunto y cuerpo completo del correo para enviarlo por cualquier aplicación"
                        >
                          {copiedMailText ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">¡Mail copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copiar texto del mail</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 bg-white p-3 rounded-lg border border-blue-100 font-mono text-slate-700">
                      <div>
                        <strong className="text-slate-500 font-sans">Destinatario:</strong>{' '}
                        {currentStudent.email ? (
                          <span className="text-blue-700 font-bold">{currentStudent.email}</span>
                        ) : (
                          <span className="text-rose-600 font-sans italic font-medium">
                            Sin dirección de correo registrada. (Haga clic en 'Asignar correo al alumno' para habilitar el envío).
                          </span>
                        )}
                      </div>
                      <div>
                        <strong className="text-slate-500 font-sans">Asunto:</strong>{' '}
                        <span className="text-slate-900">{datosMail.asunto}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* SECCIÓN OCULTA: IMPRESIÓN MASIVA DE TODOS LOS ALUMNOS     */}
              {/* (Solo se muestra en @media print si isBatchPrinting=true) */}
              {/* ========================================================= */}
              {isBatchPrinting && (
                <div className="hidden print:block space-y-8">
                  {alumnosActivos.map((alumno) => {
                    const studentActs = actividadesFiltradas.filter(a => a.curso === alumno.curso);
                    const res = calcularPendientesAlumno(alumno, studentActs, notas);
                    const txtFamilia = generarTextoFamiliaPendientes(
                      alumno.alumno,
                      rangoFechas.nombre,
                      res.nombresPendientes
                    );

                    return (
                      <div
                        key={`batch-${alumno.curso}-${alumno.numero}`}
                        className="bg-white p-6 border-b-4 border-slate-900 space-y-6"
                        style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                      >
                        {/* Encabezado */}
                        <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block">
                              Registro Escolar 2026 • Informe de Trabajos Pendientes
                            </span>
                            <h2 className="text-lg font-black text-slate-900 mt-0.5">{alumno.alumno}</h2>
                            <div className="text-xs text-slate-600 mt-0.5">
                              <strong>Curso:</strong> {alumno.curso} &nbsp;|&nbsp; <strong>N°:</strong> {alumno.numero} &nbsp;|&nbsp; <strong>Período:</strong> {rangoFechas.nombre}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Fecha: {fechaHoyStr}</span>
                            <span className="text-xs font-bold uppercase">
                              Semáforo: {res.semaforo}
                            </span>
                          </div>
                        </div>

                        {/* Métricas */}
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Actividades</span>
                            <strong className="text-sm">{res.totalActividades}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Entregadas</span>
                            <strong className="text-sm">{res.totalEntregadas}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Adeudadas</span>
                            <strong className="text-sm text-rose-700">{res.totalPendientes + res.totalAusentesPrueba}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">% Cumplimiento</span>
                            <strong className="text-sm">{res.porcentajeCumplimiento}%</strong>
                          </div>
                        </div>

                        {/* Tabla */}
                        <table className="min-w-full text-xs border border-slate-300">
                          <thead className="bg-slate-100 text-left">
                            <tr>
                              <th className="p-2 border border-slate-300">Actividad</th>
                              <th className="p-2 border border-slate-300">Tipo</th>
                              <th className="p-2 border border-slate-300">Fecha</th>
                              <th className="p-2 border border-slate-300 text-center">Estado</th>
                              <th className="p-2 border border-slate-300 text-center">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {res.actividadesEvaluadas.map((item, i) => (
                              <tr key={i} className="border-b border-slate-200">
                                <td className="p-2 border border-slate-300 font-semibold">{item.nombreActividad}</td>
                                <td className="p-2 border border-slate-300">{item.tipo}</td>
                                <td className="p-2 border border-slate-300">{item.fecha ? fmtFecha(item.fecha) : '—'}</td>
                                <td className="p-2 border border-slate-300 text-center font-bold">{item.estadoEtiqueta}</td>
                                <td className="p-2 border border-slate-300 text-center">{item.nota}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Mensaje */}
                        <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs">
                          <strong>Notificación a la familia:</strong>
                          <p className="mt-1 leading-relaxed">{txtFamilia}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL DE EDICIÓN / ASIGNACIÓN RÁPIDA DE CORREO ELECTRÓNICO */}
      {showQuickEmailModal && currentStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Correo de {currentStudent.alumno}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickEmailError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs font-medium">
                {quickEmailError}
              </div>
            )}

            <form onSubmit={handleSaveQuickEmail} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Dirección de Email:
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={quickEmailInput}
                  onChange={(e) => {
                    setQuickEmailInput(e.target.value);
                    if (quickEmailError) setQuickEmailError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Se guardará en la ficha del estudiante y quedará disponible para todos los informes y respaldos.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickEmailModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Guardar Correo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
