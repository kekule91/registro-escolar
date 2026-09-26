import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../context/SchoolContext';
import {
  listaPorEscala,
  normalizarNotaPorEscala,
  notaOrden,
  obtenerBadgeEstiloNota,
  fmtFechaNotas
} from '../utils/gradeEngine';
import { RegistroNota, EscalaNotas } from '../types';
import {
  FileCheck2,
  Clock,
  Plus,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  BarChart2
} from 'lucide-react';

interface GradeInputCellProps {
  alumnoNum: number;
  alumnoNombre: string;
  currentNota: string;
  escala: EscalaNotas;
  allowedGrades: readonly string[];
  badge: { bg: string; text: string; border: string };
  handleNotaChange: (alumnoNum: number, alumnoNombre: string, value: string) => void;
}

const GradeInputCell: React.FC<GradeInputCellProps> = ({
  alumnoNum,
  alumnoNombre,
  currentNota,
  escala,
  allowedGrades,
  badge,
  handleNotaChange
}) => {
  const [localValue, setLocalValue] = useState(currentNota);

  useEffect(() => {
    setLocalValue(currentNota);
  }, [currentNota]);

  if (escala === 'NUMERICA_1_10') {
    return (
      <input
        id={`nota-${alumnoNum}`}
        name={`nota-${alumnoNum}`}
        type="text"
        value={localValue}
        placeholder="Ej: 7,50"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          const norm = normalizarNotaPorEscala(e.target.value, escala);
          setLocalValue(norm);
          handleNotaChange(alumnoNum, alumnoNombre, norm);
        }}
        className={`w-32 text-xs rounded-lg border py-1.5 px-2 font-medium focus:ring-2 focus:ring-blue-500 transition-all ${
          localValue
            ? `${badge.bg} ${badge.text} ${badge.border}`
            : 'bg-white border-slate-300 text-slate-400'
        }`}
      />
    );
  }

  return (
    <select
      id={`nota-${alumnoNum}`}
      name={`nota-${alumnoNum}`}
      value={currentNota}
      onChange={(e) => handleNotaChange(alumnoNum, alumnoNombre, e.target.value)}
      className={`text-xs rounded-lg border py-1.5 px-2 font-medium focus:ring-2 focus:ring-blue-500 transition-all ${
        currentNota
          ? `${badge.bg} ${badge.text} ${badge.border}`
          : 'bg-white border-slate-300 text-slate-400'
      }`}
    >
      <option value="">-- Sin cargar --</option>
      {allowedGrades.map(g => (
        <option key={g} value={g} className="bg-white text-slate-900">
          {g}
        </option>
      ))}
    </select>
  );
};

interface GradebookViewProps {
  onOpenNewActivityModal: () => void;
}

export const GradebookView: React.FC<GradebookViewProps> = ({ onOpenNewActivityModal }) => {
  const {
    selectedCurso,
    actividades,
    alumnos,
    notas,
    upsertNotas,
    marcarPendientesActividad
  } = useSchool();

  // Active activities for this course
  const courseActivities = useMemo(() => {
    return actividades.filter(a => a.curso === selectedCurso && a.activa);
  }, [actividades, selectedCurso]);

  const [selectedActivityId, setSelectedActivityId] = useState<string>(() => {
    return courseActivities.length > 0 ? courseActivities[0].id : "";
  });

  // Keep selected activity valid if course changes
  const activeActivity = useMemo(() => {
    const found = courseActivities.find(a => a.id === selectedActivityId);
    if (found) return found;
    return courseActivities.length > 0 ? courseActivities[0] : null;
  }, [courseActivities, selectedActivityId]);

  const courseStudents = useMemo(() => {
    return alumnos
      .filter(a => a.curso === selectedCurso && a.activo)
      .sort((a, b) => a.numero - b.numero);
  }, [alumnos, selectedCurso]);

  const allowedGrades = useMemo(() => {
    if (!activeActivity) return [];
    return listaPorEscala(activeActivity.escala);
  }, [activeActivity]);

  // Handle cell edit
  const handleNotaChange = (alumnoNum: number, alumnoNombre: string, value: string) => {
    if (!activeActivity) return;

    const norm = normalizarNotaPorEscala(value, activeActivity.escala);
    const clave = `${activeActivity.id}|${selectedCurso}|${alumnoNum}`;
    const prev = notas[clave];

    const registro: RegistroNota = {
      clave,
      actividadId: activeActivity.id,
      curso: selectedCurso,
      numero: alumnoNum,
      alumno: alumnoNombre,
      tipo: activeActivity.tipo,
      periodo: activeActivity.periodo,
      actividad: activeActivity.nombre,
      fecha: activeActivity.fecha,
      escala: activeActivity.escala,
      nota: norm,
      notaNormalizada: notaOrden(norm, activeActivity.escala),
      observacion: prev?.observacion || "",
      actualizado: new Date().toISOString(),
      origen: "Manual"
    };

    upsertNotas([registro]);
  };

  const handleObsChange = (alumnoNum: number, alumnoNombre: string, obs: string) => {
    if (!activeActivity) return;

    const clave = `${activeActivity.id}|${selectedCurso}|${alumnoNum}`;
    const prev = notas[clave];

    const registro: RegistroNota = {
      clave,
      actividadId: activeActivity.id,
      curso: selectedCurso,
      numero: alumnoNum,
      alumno: alumnoNombre,
      tipo: activeActivity.tipo,
      periodo: activeActivity.periodo,
      actividad: activeActivity.nombre,
      fecha: activeActivity.fecha,
      escala: activeActivity.escala,
      nota: prev?.nota || "",
      notaNormalizada: prev?.notaNormalizada || "",
      observacion: obs,
      actualizado: new Date().toISOString(),
      origen: "Manual"
    };

    upsertNotas([registro]);
  };

  // Compute activity statistics
  const stats = useMemo(() => {
    if (!activeActivity || courseStudents.length === 0) {
      return { total: 0, cargadas: 0, sinCargar: 0, pendientes: 0, breakdown: {}, promedio: null };
    }

    let cargadas = 0;
    let pendientes = 0;
    const breakdown: Record<string, number> = {};
    const numericGrades: number[] = [];

    courseStudents.forEach(s => {
      const reg = notas[`${activeActivity.id}|${selectedCurso}|${s.numero}`];
      const nota = reg?.nota || "";
      if (nota) {
        cargadas++;
        if (nota === "Pendiente") pendientes++;
        breakdown[nota] = (breakdown[nota] || 0) + 1;
        
        const n = Number(nota.replace(",", "."));
        if (!isNaN(n) && n >= 1 && n <= 10) {
          numericGrades.push(n);
        }
      }
    });

    const total = courseStudents.length;
    const sinCargar = total - cargadas;
    const promedio = numericGrades.length > 0
      ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(2)
      : null;

    return { total, cargadas, sinCargar, pendientes, breakdown, promedio };
  }, [activeActivity, courseStudents, notas, selectedCurso]);

  const [notification, setNotification] = useState<string | null>(null);

  const handleMarcarPendientes = () => {
    if (!activeActivity) return;
    const count = marcarPendientesActividad(activeActivity.id, selectedCurso);
    if (count > 0) {
      setNotification(`Se marcaron ${count} alumnos como "Pendiente".`);
    } else {
      setNotification("No había alumnos sin nota para marcar como Pendiente.");
    }
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Activity Selector & Meta */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Curso {selectedCurso}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">Planilla de Calificaciones</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="activity-select" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                Actividad activa:
              </label>
              {courseActivities.length > 0 ? (
                <select
                  id="activity-select"
                  value={activeActivity?.id || ""}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 font-medium min-w-[280px]"
                >
                  {courseActivities.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} — {a.tipo} ({a.periodo})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-slate-500 italic">No hay actividades activas para este curso.</span>
              )}

              <button
                onClick={onOpenNewActivityModal}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Actividad / TP / Prueba</span>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          {activeActivity && (
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={handleMarcarPendientes}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                title="Rellena las celdas vacías con el estado Pendiente"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Marcar sin cargar como Pendiente</span>
              </button>
            </div>
          )}
        </div>

        {/* Activity Details Strip */}
        {activeActivity && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Tipo:</span>
              <span className="font-semibold text-slate-800">{activeActivity.tipo}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Período:</span>
              <span className="font-semibold text-slate-800">{activeActivity.periodo}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Escala:</span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">{activeActivity.escala}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Fecha:</span>
              <span className="font-semibold text-slate-800">{activeActivity.fecha ? activeActivity.fecha : "Sin fecha"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Alumnos:</span>
              <span className="font-semibold text-slate-800">{stats.cargadas} de {stats.total} cargados</span>
            </div>
            {stats.promedio !== null && (
              <div>
                <span className="text-slate-400 block font-medium">Promedio:</span>
                <span className="font-bold text-blue-600 text-sm">{stats.promedio}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Main Gradebook Grid & Real-time Summary layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student Table */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-emerald-50/70 text-slate-700 text-left font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">N°</th>
                  <th className="py-3 px-4 min-w-[200px]">Apellido y Nombre</th>
                  <th className="py-3 px-4 w-48">Nota</th>
                  <th className="py-3 px-4 min-w-[240px]">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {courseStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                      No hay alumnos registrados en {selectedCurso}.
                    </td>
                  </tr>
                ) : !activeActivity ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                      No hay una actividad seleccionada. Crea una actividad para comenzar a calificar.
                    </td>
                  </tr>
                ) : (
                  courseStudents.map((alumno) => {
                    const reg = notas[`${activeActivity.id}|${selectedCurso}|${alumno.numero}`];
                    const currentNota = reg?.nota || "";
                    const currentObs = reg?.observacion || "";
                    const badge = obtenerBadgeEstiloNota(currentNota);

                    return (
                      <tr key={alumno.numero} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-xs font-mono font-medium text-slate-500">
                          {alumno.numero}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {alumno.alumno}
                          {alumno.observaciones && (
                            <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-normal">
                              {alumno.observaciones}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center space-x-2">
                            <GradeInputCell
                              alumnoNum={alumno.numero}
                              alumnoNombre={alumno.alumno}
                              currentNota={currentNota}
                              escala={activeActivity.escala}
                              allowedGrades={allowedGrades}
                              badge={badge}
                              handleNotaChange={handleNotaChange}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            id={`obs-${alumno.numero}`}
                            name={`obs-${alumno.numero}`}
                            type="text"
                            value={currentObs}
                            placeholder="Comentario u observación..."
                            onChange={(e) => handleObsChange(alumno.numero, alumno.alumno, e.target.value)}
                            className="w-full text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-400 rounded-md px-2 py-1.5 text-slate-700 placeholder-slate-400 transition-all"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Resumen de Actividad (Matches agregarResumenActividad_) */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Resumen de Actividad
              </h3>
            </div>

            {activeActivity ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Cargadas:</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    {stats.cargadas} / {stats.total}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Sin cargar:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${stats.sinCargar > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-500 bg-slate-100'}`}>
                    {stats.sinCargar}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Pendientes:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${stats.pendientes > 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-500 bg-slate-100'}`}>
                    {stats.pendientes}
                  </span>
                </div>

                {stats.promedio !== null && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 bg-blue-50/50 -mx-1 px-1 rounded-md">
                    <span className="text-blue-900 font-semibold flex items-center space-x-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      <span>Promedio general:</span>
                    </span>
                    <span className="font-bold text-blue-700 text-sm">
                      {stats.promedio}
                    </span>
                  </div>
                )}

                {/* Breakdown by Grade */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Distribución por Calificación:
                  </span>
                  <div className="space-y-1.5">
                    {allowedGrades.map(g => {
                      const count = stats.breakdown[g] || 0;
                      const badge = obtenerBadgeEstiloNota(g);
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

                      return (
                        <div key={g} className="flex items-center justify-between text-xs py-0.5">
                          <span className={`px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border} text-[11px]`}>
                            {g}
                          </span>
                          <div className="flex items-center space-x-2 text-slate-500">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono font-medium text-[11px] w-6 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Selecciona una actividad para ver el resumen.</p>
            )}
          </div>

          {/* Quick Guide Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>Autoguardado Seguro</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Toda modificación se guarda automáticamente al instante. Al completar el período, visita la sección <strong>Informes & Sugerencias</strong> para generar las notas bimestrales ponderadas según el régimen oficial 70/30.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
