import React, { useState, useMemo } from 'react';
import { useSchool } from '../context/SchoolContext';
import {
  generarSesionesCursoRango,
  keyAsistencia,
  ESTADOS_PRESENTISMO,
  INFO_ESTADOS_PRESENTISMO,
  normalizarEstadoPresentismo,
  nombreDia
} from '../utils/attendanceEngine';
import { EstadoPresentismo, RegistroAsistencia } from '../types';
import {
  CalendarDays,
  CheckCheck,
  Ban,
  Calendar,
  Sparkles,
  Info,
  ChevronDown
} from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const {
    selectedCurso,
    cursos,
    alumnos,
    meses,
    diasNoClase,
    asistencias,
    upsertAsistencias,
    marcarDiaNC,
    marcarDiaP
  } = useSchool();

  const currentCursoObj = useMemo(() => {
    return cursos.find(c => c.curso === selectedCurso) || cursos[0];
  }, [cursos, selectedCurso]);

  const [selectedMesName, setSelectedMesName] = useState<string>(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const activeMes = meses.find(m => todayStr >= m.inicio && todayStr <= m.fin);
    return activeMes ? activeMes.mes : (meses.length > 0 ? meses[0].mes : "Marzo 2026");
  });

  const currentMesObj = useMemo(() => {
    return meses.find(m => m.mes === selectedMesName) || meses[0];
  }, [meses, selectedMesName]);

  const courseStudents = useMemo(() => {
    return alumnos
      .filter(a => a.curso === selectedCurso && a.activo)
      .sort((a, b) => a.numero - b.numero);
  }, [alumnos, selectedCurso]);

  // Generate sessions for this course and month
  const sesiones = useMemo(() => {
    if (!currentCursoObj || !currentMesObj) return [];
    return generarSesionesCursoRango(
      currentCursoObj,
      currentMesObj.inicio,
      currentMesObj.fin,
      diasNoClase
    );
  }, [currentCursoObj, currentMesObj, diasNoClase]);

  // Handle cell click (cycle states: "" -> P -> A -> T -> R -> J -> N/C -> "")
  const handleCellClick = (studentNum: number, studentName: string, fechaYmd: string, bloque: string) => {
    const key = keyAsistencia(selectedCurso, studentNum, fechaYmd, bloque);
    const current = asistencias[key]?.estado || "";

    const cycle: EstadoPresentismo[] = ["", "P", "A", "T", "R", "J", "N/C"];
    const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
    const nextState = cycle[nextIndex];

    const registro: RegistroAsistencia = {
      clave: key,
      curso: selectedCurso,
      numero: studentNum,
      alumno: studentName,
      fecha: fechaYmd,
      dia: nombreDia(new Date(fechaYmd)),
      mes: selectedMesName,
      bimestre: "Bimestre",
      bloque,
      estado: nextState,
      actualizado: new Date().toISOString()
    };

    upsertAsistencias([registro]);
  };

  // Direct set on cell
  const handleDirectSet = (studentNum: number, studentName: string, fechaYmd: string, bloque: string, state: EstadoPresentismo) => {
    const key = keyAsistencia(selectedCurso, studentNum, fechaYmd, bloque);
    const registro: RegistroAsistencia = {
      clave: key,
      curso: selectedCurso,
      numero: studentNum,
      alumno: studentName,
      fecha: fechaYmd,
      dia: nombreDia(new Date(fechaYmd)),
      mes: selectedMesName,
      bimestre: "Bimestre",
      bloque,
      estado: state,
      actualizado: new Date().toISOString()
    };
    upsertAsistencias([registro]);
  };

  // Quick Action menu for specific session column
  const [activeSessionMenu, setActiveSessionMenu] = useState<string | null>(null);

  // Daily summary calculations for each session
  const dailySummary = useMemo(() => {
    return sesiones.map(s => {
      let p = 0;
      let a = 0;
      let t = 0;
      let r = 0;
      let j = 0;
      let nc = 0;

      courseStudents.forEach(st => {
        const key = keyAsistencia(selectedCurso, st.numero, s.ymd, s.bloque);
        const stState = asistencias[key]?.estado || "";
        if (stState === "P") p++;
        else if (stState === "A") a++;
        else if (stState === "T") t++;
        else if (stState === "R") r++;
        else if (stState === "J") j++;
        else if (stState === "N/C") nc++;
      });

      const computables = p + t + r;
      const totalCargado = p + a + t + r + j;
      const corresponden = Math.max(0, courseStudents.length - nc);
      const sinCargar = Math.max(0, corresponden - totalCargado);
      const pctCargados = totalCargado > 0 ? ((computables / totalCargado) * 100).toFixed(1) + "%" : "—";

      return {
        sesion: s,
        p,
        a,
        t,
        r,
        j,
        nc,
        computables,
        totalCargado,
        corresponden,
        sinCargar,
        pctCargados
      };
    });
  }, [sesiones, courseStudents, selectedCurso, asistencias]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Presentismo Escolar
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-700">Curso: {selectedCurso}</span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Bloques asignados: <strong className="text-slate-800 font-semibold">{currentCursoObj.bloques.replace(/\|/g, "  •  ")}</strong>
              </span>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center space-x-3">
            <label htmlFor="month-select" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Mes escolar:
            </label>
            <select
              id="month-select"
              value={selectedMesName}
              onChange={(e) => setSelectedMesName(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 font-medium"
            >
              {meses.map(m => (
                <option key={m.mes} value={m.mes}>
                  {m.mes}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-slate-400 font-medium mr-1">Leyenda:</span>
            {ESTADOS_PRESENTISMO.map(e => {
              const info = INFO_ESTADOS_PRESENTISMO[e];
              return (
                <span
                  key={e}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border ${info.bg} ${info.text} ${info.border} text-xs`}
                >
                  <strong className="font-bold">{e}</strong>
                  <span className="text-[11px] font-normal opacity-90">({info.desc})</span>
                </span>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Haz clic en una celda para alternar el estado o despliega las opciones de columna.</span>
          </div>
        </div>
      </div>

      {/* Main Monthly Attendance Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-slate-200 text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="sticky left-0 bg-slate-50 z-30 py-3 px-2 w-10 text-center font-bold text-slate-600 border-r border-slate-200">
                  N°
                </th>
                <th className="sticky left-10 bg-slate-50 z-30 py-3 px-3 min-w-[200px] text-left font-bold text-slate-700 border-r border-slate-200">
                  Apellido y Nombre
                </th>
                {sesiones.length === 0 ? (
                  <th className="py-3 px-4 text-center text-slate-400 font-normal italic">
                    No hay clases programadas en {selectedMesName} para los bloques ({currentCursoObj.bloques})
                  </th>
                ) : (
                  sesiones.map(s => {
                    const sessionKey = `${s.ymd}|${s.bloque}`;
                    const isMenuOpen = activeSessionMenu === sessionKey;

                    return (
                      <th
                        key={sessionKey}
                        className="py-2.5 px-2 text-center border-r border-slate-200 min-w-[68px] relative group hover:bg-slate-100 transition-colors"
                      >
                        <div className="font-bold text-slate-800 capitalize text-[11px]">
                          {s.header}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase font-mono">
                          {s.dia.slice(0, 3)}
                        </div>

                        {/* Dropdown for bulk action on this day */}
                        <div className="mt-1 flex justify-center">
                          <button
                            onClick={() => setActiveSessionMenu(isMenuOpen ? null : sessionKey)}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                            title="Opciones para esta fecha"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>

                        {isMenuOpen && (
                          <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-1 text-left text-xs font-normal">
                            <button
                              onClick={() => {
                                marcarDiaP(selectedCurso, s.ymd, s.bloque);
                                setActiveSessionMenu(null);
                              }}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-emerald-50 text-emerald-700 font-medium"
                            >
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Marcar todos Presente (P)</span>
                            </button>
                            <button
                              onClick={() => {
                                marcarDiaNC(selectedCurso, s.ymd, s.bloque);
                                setActiveSessionMenu(null);
                              }}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium"
                            >
                              <Ban className="w-3.5 h-3.5 text-slate-500" />
                              <span>Feriado / Sin clase (N/C)</span>
                            </button>
                          </div>
                        )}
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {courseStudents.length === 0 ? (
                <tr>
                  <td colSpan={sesiones.length + 2} className="py-8 text-center text-slate-400">
                    No hay alumnos registrados en {selectedCurso}.
                  </td>
                </tr>
              ) : (
                courseStudents.map((alumno) => (
                  <tr key={alumno.numero} className="hover:bg-blue-50/20 transition-colors">
                    <td className="sticky left-0 bg-white z-10 py-2 px-2 text-center font-mono font-medium text-slate-500 border-r border-slate-200">
                      {alumno.numero}
                    </td>
                    <td className="sticky left-10 bg-white z-10 py-2 px-3 font-medium text-slate-900 whitespace-nowrap border-r border-slate-200">
                      {alumno.alumno}
                    </td>
                    {sesiones.map(s => {
                      const key = keyAsistencia(selectedCurso, alumno.numero, s.ymd, s.bloque);
                      const currentState = asistencias[key]?.estado || "";
                      const info = INFO_ESTADOS_PRESENTISMO[currentState];

                      return (
                        <td
                          key={s.ymd + s.bloque}
                          onClick={() => handleCellClick(alumno.numero, alumno.alumno, s.ymd, s.bloque)}
                          className={`py-1.5 px-1 text-center font-bold cursor-pointer select-none border-r border-slate-100 hover:scale-105 transition-transform ${info.bg} ${info.text}`}
                          title={`${alumno.alumno} — ${s.header}: ${info.desc}`}
                        >
                          {info.label}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {/* Daily Summary Footer (Mirroring agregarResumenDiario_) */}
            {sesiones.length > 0 && courseStudents.length > 0 && (
              <tfoot className="bg-slate-50/95 font-medium text-[11px] border-t-2 border-slate-300">
                <tr className="border-b border-slate-200">
                  <td colSpan={2} className="sticky left-0 bg-slate-100 z-10 py-1.5 px-3 text-emerald-800 font-bold border-r border-slate-200">
                    Presentes (P)
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-1.5 px-1 text-center font-bold text-emerald-700 border-r border-slate-200">
                      {d.p}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-200">
                  <td colSpan={2} className="sticky left-0 bg-slate-100 z-10 py-1.5 px-3 text-rose-800 font-bold border-r border-slate-200">
                    Ausentes (A)
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-1.5 px-1 text-center font-bold text-rose-700 border-r border-slate-200">
                      {d.a}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-200">
                  <td colSpan={2} className="sticky left-0 bg-slate-100 z-10 py-1.5 px-3 text-amber-800 font-bold border-r border-slate-200">
                    Tardes (T)
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-1.5 px-1 text-center font-bold text-amber-700 border-r border-slate-200">
                      {d.t}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-200">
                  <td colSpan={2} className="sticky left-0 bg-slate-100 z-10 py-1.5 px-3 text-orange-800 font-bold border-r border-slate-200">
                    Se retiró (R)
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-1.5 px-1 text-center font-bold text-orange-700 border-r border-slate-200">
                      {d.r}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-200">
                  <td colSpan={2} className="sticky left-0 bg-slate-100 z-10 py-1.5 px-3 text-sky-800 font-bold border-r border-slate-200">
                    Justificadas (J)
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-1.5 px-1 text-center font-bold text-sky-700 border-r border-slate-200">
                      {d.j}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-200">
                  <td colSpan={2} className="sticky left-0 bg-slate-100 z-10 py-1.5 px-3 text-slate-600 font-bold border-r border-slate-200">
                    No corresponde (N/C)
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-1.5 px-1 text-center font-bold text-slate-500 border-r border-slate-200">
                      {d.nc}
                    </td>
                  ))}
                </tr>
                <tr className="bg-blue-50/50 font-semibold border-b border-slate-200">
                  <td colSpan={2} className="sticky left-0 bg-blue-100 z-10 py-1.5 px-3 text-blue-900 border-r border-slate-200">
                    Presentes computables (P+T+R)
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-1.5 px-1 text-center font-bold text-blue-800 border-r border-slate-200">
                      {d.computables}
                    </td>
                  ))}
                </tr>
                <tr className="bg-slate-100 font-semibold">
                  <td colSpan={2} className="sticky left-0 bg-slate-200 z-10 py-2 px-3 text-slate-800 border-r border-slate-200">
                    % Asistencia s/cargados
                  </td>
                  {dailySummary.map(d => (
                    <td key={d.sesion.ymd + d.sesion.bloque} className="py-2 px-1 text-center font-bold text-slate-900 border-r border-slate-200 font-mono text-[11px]">
                      {d.pctCargados}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
