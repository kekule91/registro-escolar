import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { EstadoPresentismo } from '../../types';
import {
  OpcionPeriodoInforme,
  obtenerRangoFechasPeriodo,
  obtenerUmbralesAusentismo,
  calcularAusentismoCurso,
  calcularAusentismoAlumno,
  generarTextoFamiliaAusentismo,
  descargarCSVExcel,
  DetalleFechaAusentismo
} from '../../utils/informes';
import {
  generarSesionesCursoRango,
  fmtFecha,
  INFO_ESTADOS_PRESENTISMO
} from '../../utils/attendanceEngine';
import {
  CalendarCheck,
  Users,
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
  Flame,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react';

export const AttendanceReportsSection: React.FC = () => {
  const {
    cursos,
    selectedCurso,
    setSelectedCurso,
    alumnos,
    asistencias,
    bimestres,
    diasNoClase
  } = useSchool();

  // Filtros comunes
  const [cursoFiltro, setCursoFiltro] = useState<string>(selectedCurso);
  const [periodoFiltro, setPeriodoFiltro] = useState<OpcionPeriodoInforme>('1° bimestre');
  const [tipoInforme, setTipoInforme] = useState<'curso' | 'individual'>('curso');

  // Fechas personalizadas
  const [customDesde, setCustomDesde] = useState<string>('2026-03-02');
  const [customHasta, setCustomHasta] = useState<string>('2026-05-07');

  // Alumno seleccionado para informe individual
  const [selectedStudentNum, setSelectedStudentNum] = useState<number>(1);

  // Texto sugerido editable para la familia
  const [customFamilyText, setCustomFamilyText] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Impresión por lote de todos los alumnos
  const [isBatchPrinting, setIsBatchPrinting] = useState<boolean>(false);

  // Cargar umbrales configurables
  const umbrales = useMemo(() => obtenerUmbralesAusentismo(), []);

  // Rango de fechas del período seleccionado
  const rangoFechas = useMemo(() => {
    return obtenerRangoFechasPeriodo(periodoFiltro, bimestres, customDesde, customHasta);
  }, [periodoFiltro, bimestres, customDesde, customHasta]);

  // Si cursoFiltro es 'Todos' y el usuario pasa a 'individual', asegurar un curso específico
  const effectiveCourseForIndividual = cursoFiltro === 'Todos' ? (cursos[0]?.curso || '35 TM') : cursoFiltro;

  // Objeto curso actual
  const cursoObj = useMemo(() => {
    const target = tipoInforme === 'individual' ? effectiveCourseForIndividual : cursoFiltro;
    return cursos.find(c => c.curso === target) || cursos[0];
  }, [cursos, cursoFiltro, tipoInforme, effectiveCourseForIndividual]);

  // Sesiones previstas para el curso y rango de fechas (descontando días sin clase)
  const sesionesPrevistas = useMemo(() => {
    if (!cursoObj) return [];
    return generarSesionesCursoRango(cursoObj, rangoFechas.inicio, rangoFechas.fin, diasNoClase);
  }, [cursoObj, rangoFechas, diasNoClase]);

  // Alumnos activos del curso
  const alumnosActivos = useMemo(() => {
    const targetCurso = tipoInforme === 'individual' ? effectiveCourseForIndividual : cursoFiltro;
    if (targetCurso === 'Todos') {
      return alumnos.filter(a => a.activo);
    }
    return alumnos
      .filter(a => a.curso === targetCurso && a.activo)
      .sort((a, b) => a.numero - b.numero);
  }, [alumnos, cursoFiltro, tipoInforme, effectiveCourseForIndividual]);

  // Cálculos del informe por curso
  const resumenCursoData = useMemo(() => {
    if (!cursoObj) return null;
    return calcularAusentismoCurso(
      cursoObj,
      alumnosActivos,
      sesionesPrevistas,
      asistencias,
      umbrales
    );
  }, [cursoObj, alumnosActivos, sesionesPrevistas, asistencias, umbrales]);

  // Alumno seleccionado actual para informe individual
  const currentStudent = useMemo(() => {
    const found = alumnosActivos.find(a => a.numero === selectedStudentNum);
    return found || alumnosActivos[0] || null;
  }, [alumnosActivos, selectedStudentNum]);

  // Resumen individual de ausentismo del alumno
  const resumenIndividual = useMemo(() => {
    if (!currentStudent || !cursoObj) return null;
    return calcularAusentismoAlumno(
      currentStudent,
      cursoObj,
      sesionesPrevistas,
      asistencias,
      umbrales
    );
  }, [currentStudent, cursoObj, sesionesPrevistas, asistencias, umbrales]);

  // Actualizar texto para la familia cuando cambia el alumno o el período
  useEffect(() => {
    if (resumenIndividual && currentStudent) {
      const txt = generarTextoFamiliaAusentismo(
        currentStudent.alumno,
        rangoFechas.nombre,
        resumenIndividual.A,
        resumenIndividual.porcentajeStr,
        resumenIndividual.rachaInasistenciasActual
      );
      setCustomFamilyText(txt);
    }
  }, [resumenIndividual, currentStudent, rangoFechas.nombre]);

  // Navegación de alumnos
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

  // Copiar texto para familia
  const handleCopyFamilyText = () => {
    navigator.clipboard.writeText(customFamilyText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Imprimir individual
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

  // Exportar CSV
  const handleExportCSV = () => {
    if (!resumenCursoData) return;

    // Tabla Alumnos
    const headers = [
      'N°',
      'Alumno',
      'Curso',
      'Presentes (P)',
      'Ausentes (A)',
      'Tardes (T)',
      'Retirados (R)',
      'Justificadas (J)',
      'Sin Cargar',
      '% Asistencia',
      'Semáforo'
    ];

    const rows = resumenCursoData.porAlumno.map(a => [
      a.alumno.numero,
      a.alumno.alumno,
      a.curso,
      a.P,
      a.A,
      a.T,
      a.R,
      a.J,
      a.sinCargar,
      a.porcentajeStr,
      a.semaforo.toUpperCase()
    ]);

    descargarCSVExcel(
      `Ausentismo_${cursoFiltro.replace(/\s+/g, '_')}_${periodoFiltro.replace(/\s+/g, '_')}`,
      headers,
      rows
    );
  };

  const fechaHoyStr = fmtFecha(new Date());

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
              <label htmlFor="student-picker-att" className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Seleccionar Alumno:
              </label>
              <select
                id="student-picker-att"
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
      {sesionesPrevistas.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-amber-900 space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold">No hay clases programadas en este período</h3>
          <p className="text-xs text-amber-700 max-w-lg mx-auto">
            Para el curso <strong>{cursoFiltro}</strong> (bloques <code>{cursoObj?.bloques}</code>), no coinciden días de clase hábiles en el rango seleccionado (<strong>{rangoFechas.nombre}</strong>).
          </p>
        </div>
      ) : alumnosActivos.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-amber-900 space-y-3">
          <Users className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold">No hay alumnos activos en este curso</h3>
          <p className="text-xs text-amber-700">Verifica la pestaña de Alumnos para dar de alta estudiantes en el curso {cursoFiltro}.</p>
        </div>
      ) : !resumenCursoData ? null : (
        <>
          {/* ======================================================== */}
          {/* MODO 1: INFORME POR CURSO                                */}
          {/* ======================================================== */}
          {tipoInforme === 'curso' && (
            <div className="space-y-6">
              {/* Barra de exportación */}
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="text-xs text-slate-500">
                  Informe general de presentismo de <strong>{cursoFiltro}</strong> en <strong>{rangoFechas.nombre}</strong> (Bloques: {cursoObj.bloques})
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
                  Informe de Ausentismo y Presentismo Escolar
                </h1>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span><strong>Curso:</strong> {cursoFiltro}</span>
                  <span><strong>Período:</strong> {rangoFechas.nombre}</span>
                  <span><strong>Generado el:</strong> {fechaHoyStr}</span>
                </div>
              </div>

              {/* 1. RESUMEN EN TARJETAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Clases Dictadas</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {resumenCursoData.clasesDictadas}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ {resumenCursoData.clasesPrevistas} prev.</span>
                  </p>
                  <span className="text-[10px] text-slate-400">Con registro de asistencia</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Asistencia Promedio</span>
                  <p className="text-2xl font-black text-blue-600 mt-1">
                    {resumenCursoData.porcentajePromedioStr}
                  </p>
                  <span className="text-[10px] text-slate-400">P+T+R sobre cargadas</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Alerta Amarilla</span>
                  <p className="text-2xl font-black text-amber-600 mt-1">
                    {resumenCursoData.totalAlertaAmarilla}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    &gt;= {umbrales.amarillaInasistencias} faltas o &lt; {umbrales.amarillaPorcentaje}%
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Alerta Roja</span>
                  <p className="text-2xl font-black text-rose-600 mt-1">
                    {resumenCursoData.totalAlertaRoja}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    &gt;= {umbrales.rojaInasistencias} faltas o &lt; {umbrales.rojaPorcentaje}%
                  </span>
                </div>
              </div>

              {/* 4. GRÁFICO DE LÍNEA: % ASISTENCIA POR FECHA */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span>Evolución de Asistencia por Fecha (%)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Línea de alerta roja fijada en 70% de asistencia diaria.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                      <span>Asistencia día</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-1 rounded bg-rose-500 inline-block"></span>
                      <span>Límite 70%</span>
                    </span>
                  </div>
                </div>

                {/* SVG Line Chart */}
                {resumenCursoData.porFecha.filter(f => f.porcentajeDia !== null).length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Aún no hay asistencias cargadas en este período para graficar la evolución.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[550px] h-48 relative pt-4 pb-8 pr-4">
                      {/* SVG Chart */}
                      {(() => {
                        const fechasConDatos = resumenCursoData.porFecha.filter(f => f.porcentajeDia !== null);
                        if (fechasConDatos.length === 0) return null;

                        const width = Math.max(540, fechasConDatos.length * 45);
                        const height = 140;
                        const paddingY = 20;

                        // Puntos para la polilínea
                        const points = fechasConDatos.map((item, idx) => {
                          const x = (idx / Math.max(1, fechasConDatos.length - 1)) * (width - 60) + 40;
                          const pct = item.porcentajeDia ?? 0;
                          // Invertir Y: 100% arriba (paddingY), 0% abajo (height)
                          const y = height - (pct / 100) * (height - paddingY);
                          return { x, y, pct, ...item };
                        });

                        const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

                        // Línea guía 70%
                        const y70 = height - (70 / 100) * (height - paddingY);
                        // Línea guía 85%
                        const y85 = height - (85 / 100) * (height - paddingY);

                        return (
                          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height + 25}`}>
                            {/* Guías horizontales */}
                            <line x1="30" y1={paddingY} x2={width - 20} y2={paddingY} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <text x="5" y={paddingY + 3} className="text-[9px] fill-slate-400 font-mono">100%</text>

                            <line x1="30" y1={y85} x2={width - 20} y2={y85} stroke="#cbd5e1" strokeDasharray="3 3" />
                            <text x="5" y={y85 + 3} className="text-[9px] fill-slate-400 font-mono">85%</text>

                            <line x1="30" y1={y70} x2={width - 20} y2={y70} stroke="#f43f5e" strokeDasharray="4 2" strokeWidth="1.5" />
                            <text x="5" y={y70 + 3} className="text-[9px] fill-rose-500 font-bold font-mono">70%</text>

                            {/* Línea de datos */}
                            <polyline
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={pointsString}
                            />

                            {/* Puntos y etiquetas */}
                            {points.map((p, idx) => {
                              const esBajo = p.pct < 70;
                              return (
                                <g key={idx} className="group">
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={esBajo ? 5 : 4}
                                    fill={esBajo ? '#e11d48' : '#2563eb'}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    className="cursor-pointer transition-all hover:r-6"
                                  />
                                  <text
                                    x={p.x}
                                    y={p.y - 8}
                                    textAnchor="middle"
                                    className={`text-[9px] font-mono font-bold ${
                                      esBajo ? 'fill-rose-600' : 'fill-slate-700'
                                    }`}
                                  >
                                    {p.pct.toFixed(0)}%
                                  </text>
                                  {/* Etiqueta fecha abajo */}
                                  <text
                                    x={p.x}
                                    y={height + 16}
                                    textAnchor="middle"
                                    className="text-[9px] fill-slate-500 font-mono"
                                  >
                                    {p.header}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. TABLA POR ALUMNO (ordenada por inasistencias) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Detalle de Asistencia por Alumno
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ordenado de mayor a menor cantidad de inasistencias (A). Computables: P + T + R.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">P = Presente</span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">A = Ausente</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">T = Tarde</span>
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold">R = Se retiró</span>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">J = Justificada</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">N°</th>
                        <th className="py-3 px-4 min-w-[180px]">Alumno</th>
                        <th className="py-3 px-2 text-center w-12 text-emerald-800">P</th>
                        <th className="py-3 px-2 text-center w-12 text-rose-800">A</th>
                        <th className="py-3 px-2 text-center w-12 text-amber-800">T</th>
                        <th className="py-3 px-2 text-center w-12 text-orange-800">R</th>
                        <th className="py-3 px-2 text-center w-12 text-sky-800">J</th>
                        <th className="py-3 px-3 text-center min-w-[90px]">% Asistencia</th>
                        <th className="py-3 px-3 text-center min-w-[80px]">Sin cargar</th>
                        <th className="py-3 px-3 text-center w-24">Semáforo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {resumenCursoData.porAlumno.map(item => {
                        return (
                          <tr key={item.alumno.numero} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                              {item.alumno.numero}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {item.alumno.alumno}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">
                              {item.P}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-black text-rose-700">
                              {item.A}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-amber-700">
                              {item.T}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-orange-700">
                              {item.R}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-sky-700">
                              {item.J}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              <span
                                className={
                                  item.porcentajeAsistencia === null
                                    ? 'text-slate-400'
                                    : item.porcentajeAsistencia >= umbrales.amarillaPorcentaje
                                    ? 'text-emerald-700'
                                    : item.porcentajeAsistencia >= umbrales.rojaPorcentaje
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }
                              >
                                {item.porcentajeStr}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {item.sinCargar}
                            </td>
                            <td className="py-2.5 px-3 text-center">
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

              {/* 3. TABLA POR FECHA (con alerta < 70%) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Asistencia del Curso por Sesión / Fecha
                  </h3>
                  <span className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Días con asistencia menor al 70% están resaltados</span>
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-4 min-w-[120px]">Fecha</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Día / Bloque</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Presentes (P+T+R)</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Ausentes (A+J)</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Total Cargadas</th>
                        <th className="py-2.5 px-4 text-center min-w-[110px]">% del Día</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {resumenCursoData.porFecha.map((f, i) => {
                        const esAlertaBaja = f.menorA70 && f.totalCargadas > 0;

                        return (
                          <tr
                            key={i}
                            className={`transition-colors ${
                              esAlertaBaja
                                ? 'bg-rose-50/80 hover:bg-rose-100/70 font-semibold'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                              {fmtFecha(f.ymd)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 capitalize">
                              {f.dia} <span className="text-slate-400">({f.bloque})</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                              {f.presentes}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                              {f.ausentes}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                              {f.totalCargadas}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {f.totalCargadas === 0 ? (
                                <span className="text-slate-300 font-mono">Sin cargar</span>
                              ) : (
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full font-bold font-mono text-xs ${
                                    esAlertaBaja
                                      ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {f.porcentajeStr}
                                </span>
                              )}
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
                  Informe individual de presentismo para legajo o notificación
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrintBatch}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
                    title="Genera un PDF con un alumno por página para todo el curso"
                  >
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Imprimir todos los individuales del curso</span>
                  </button>
                  <button
                    onClick={handlePrintIndividual}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir / Guardar PDF</span>
                  </button>
                </div>
              </div>

              {/* CONTENEDOR IMPRIMIBLE DEL ALUMNO ACTUAL */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 individual-report-card">
                {/* Encabezado formal */}
                <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase block">
                      Registro Escolar 2026 • Informe de Presentismo Escolar
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
                        Semáforo: {resumenIndividual.semaforo === 'verde' ? 'Normal (Verde)' : resumenIndividual.semaforo === 'amarillo' ? 'Alerta Amarilla' : 'Alerta Roja'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Totales y métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Presentes (P)</span>
                    <p className="text-lg font-bold text-emerald-700">{resumenIndividual.P}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Inasistencias (A)</span>
                    <p className="text-lg font-black text-rose-700">{resumenIndividual.A}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Tardes (T)</span>
                    <p className="text-lg font-bold text-amber-700">{resumenIndividual.T}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Retirados (R)</span>
                    <p className="text-lg font-bold text-orange-700">{resumenIndividual.R}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Justificadas (J)</span>
                    <p className="text-lg font-bold text-sky-700">{resumenIndividual.J}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">% Asistencia</span>
                    <p className="text-lg font-black text-indigo-700">{resumenIndividual.porcentajeStr}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Racha Ausente</span>
                    <p className="text-lg font-bold flex items-center justify-center space-x-1 text-slate-800">
                      {resumenIndividual.rachaInasistenciasActual > 1 && <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />}
                      <span>{resumenIndividual.rachaInasistenciasActual}</span>
                    </p>
                  </div>
                </div>

                {/* CALENDARIO / LISTA DE DETALLE DE FECHAS */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Cronograma de Clases y Asistencia Detallada</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {resumenIndividual.cargadas} de {resumenIndividual.corresponden} clases cargadas
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1 border border-slate-200 rounded-lg">
                    {resumenIndividual.detalleSesiones.map((ses, i) => {
                      const st = ses.estado as EstadoPresentismo;
                      const info = INFO_ESTADOS_PRESENTISMO[st] || INFO_ESTADOS_PRESENTISMO[''];

                      return (
                        <div
                          key={i}
                          className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                            info.bg
                          } ${info.border}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-[11px] font-bold text-slate-700">
                              {ses.header}
                            </span>
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                                info.text
                              }`}
                            >
                              {st || '—'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate mt-1">
                            {info.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TEXTO SUGERIDO EDITABLE PARA LA FAMILIA */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 print:border-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Mensaje Sugerido para la Familia (Editable)</span>
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
                    💡 Modifica el texto a tu gusto y presiona "Copiar texto" para compartirlo por WhatsApp o correo electrónico.
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* SECCIÓN OCULTA: IMPRESIÓN MASIVA DE TODOS LOS ALUMNOS     */}
              {/* ========================================================= */}
              {isBatchPrinting && (
                <div className="hidden print:block space-y-8">
                  {alumnosActivos.map((alumno) => {
                    const res = calcularAusentismoAlumno(
                      alumno,
                      cursoObj,
                      sesionesPrevistas,
                      asistencias,
                      umbrales
                    );
                    const txtFamilia = generarTextoFamiliaAusentismo(
                      alumno.alumno,
                      rangoFechas.nombre,
                      res.A,
                      res.porcentajeStr,
                      res.rachaInasistenciasActual
                    );

                    return (
                      <div
                        key={`batch-att-${alumno.curso}-${alumno.numero}`}
                        className="bg-white p-6 border-b-4 border-slate-900 space-y-6"
                        style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                      >
                        {/* Encabezado */}
                        <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block">
                              Registro Escolar 2026 • Informe de Presentismo Escolar
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
                        <div className="grid grid-cols-6 gap-2 text-xs text-center">
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Presentes (P)</span>
                            <strong className="text-sm">{res.P}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Inasistencias (A)</span>
                            <strong className="text-sm text-rose-700">{res.A}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Tardes (T)</span>
                            <strong className="text-sm">{res.T}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Retirados (R)</span>
                            <strong className="text-sm">{res.R}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">Justificadas (J)</span>
                            <strong className="text-sm">{res.J}</strong>
                          </div>
                          <div className="border border-slate-300 p-2 rounded">
                            <span className="text-[10px] text-slate-500 block">% Asistencia</span>
                            <strong className="text-sm">{res.porcentajeStr}</strong>
                          </div>
                        </div>

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
    </div>
  );
};
