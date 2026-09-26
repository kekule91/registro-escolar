import React, { useMemo, useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { OpcionPeriodoInforme, calcularAusentismoCurso, descargarCSVExcel, obtenerRangoFechasPeriodo } from '../../utils/informes';
import { fmtFecha } from '../../utils/attendanceEngine';

export const AttendanceReportsSection: React.FC = () => {
  const { cursos, selectedCurso, alumnos, asistencias, diasNoClase } = useSchool();
  const [cursoFiltro, setCursoFiltro] = useState<string>(selectedCurso || cursos?.[0]?.curso || '');
  const [periodoFiltro, setPeriodoFiltro] = useState<OpcionPeriodoInforme>('Todo el año');

  const resumen = useMemo(() => {
    const cursoObj = (cursos || []).find((c: any) => c.curso === cursoFiltro) || cursos?.[0];
    if (!cursoObj) return null;
    return calcularAusentismoCurso(cursoObj, alumnos || [], asistencias || {}, diasNoClase || [], periodoFiltro);
  }, [alumnos, asistencias, cursoFiltro, cursos, diasNoClase, periodoFiltro]);

  const rango = useMemo(() => obtenerRangoFechasPeriodo(periodoFiltro), [periodoFiltro]);

  const exportarCsv = () => {
    if (!resumen) return;
    const headers = ['N°', 'Alumno', 'Curso', 'P', 'A', 'T', 'R', 'J', 'N/C', '% Ausentismo'];
    const rows = (resumen.porAlumno || []).map((item: any) => [
      item.alumno.numero,
      item.alumno.alumno,
      item.curso,
      item.P,
      item.A,
      item.T,
      item.R,
      item.J,
      item['N/C'],
      `${item.porcentajeAusentismo ?? 0}%`
    ]);
    descargarCSVExcel(`Ausentismo_${cursoFiltro}_${periodoFiltro}`.replace(/\s+/g, '_'), headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className="border rounded-md p-2" value={cursoFiltro} onChange={e => setCursoFiltro(e.target.value)}>
          {(cursos || []).map((c: any) => <option key={c.curso} value={c.curso}>{c.curso}</option>)}
        </select>
        <select className="border rounded-md p-2" value={periodoFiltro} onChange={e => setPeriodoFiltro(e.target.value as OpcionPeriodoInforme)}>
          {['Todo el año', '1° bimestre', '2° bimestre', '3° bimestre', '4° bimestre'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="button" className="border rounded-md p-2" onClick={exportarCsv}>Exportar CSV</button>
      </div>

      <div className="text-sm text-slate-600">
        Rango: {fmtFecha(rango.desde)} al {fmtFecha(rango.hasta)}
      </div>

      {!resumen ? <div className="text-sm text-slate-500">Sin datos disponibles.</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="border rounded-lg p-3"><strong>{resumen.totalSesiones}</strong><div>Sesiones</div></div>
            <div className="border rounded-lg p-3"><strong>{resumen.totalInasistencias}</strong><div>Inasistencias</div></div>
            <div className="border rounded-lg p-3"><strong>{resumen.totalTardanzas}</strong><div>Tardanzas</div></div>
            <div className="border rounded-lg p-3"><strong>{resumen.porcentajeAusentismoPromedio}%</strong><div>Promedio</div></div>
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">N°</th>
                  <th className="p-2 text-left">Alumno</th>
                  <th className="p-2 text-left">P</th>
                  <th className="p-2 text-left">A</th>
                  <th className="p-2 text-left">T</th>
                  <th className="p-2 text-left">R</th>
                  <th className="p-2 text-left">J</th>
                  <th className="p-2 text-left">N/C</th>
                  <th className="p-2 text-left">% Aus.</th>
                </tr>
              </thead>
              <tbody>
                {(resumen.porAlumno || []).map((item: any) => (
                  <tr key={item.alumno.numero} className="border-t">
                    <td className="p-2">{item.alumno.numero}</td>
                    <td className="p-2">{item.alumno.alumno}</td>
                    <td className="p-2">{item.P}</td>
                    <td className="p-2">{item.A}</td>
                    <td className="p-2">{item.T}</td>
                    <td className="p-2">{item.R}</td>
                    <td className="p-2">{item.J}</td>
                    <td className="p-2">{item['N/C']}</td>
                    <td className="p-2">{item.porcentajeAusentismo}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
