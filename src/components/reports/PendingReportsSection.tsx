import React, { useMemo, useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  OpcionPeriodoInforme,
  calcularPendientesAlumno,
  descargarCSVExcel,
  generarMailInformePendientes,
  generarTextoFamiliaPendientes,
  resumenPendientesCurso
} from '../../utils/informes';

export const PendingReportsSection: React.FC = () => {
  const { cursos, selectedCurso, alumnos, actividades, notas } = useSchool();
  const [cursoFiltro, setCursoFiltro] = useState<string>(selectedCurso || cursos?.[0]?.curso || '');
  const [periodoFiltro, setPeriodoFiltro] = useState<OpcionPeriodoInforme>('Todo el año');

  const resumenCurso = useMemo(() => {
    const cursoObj = (cursos || []).find((c: any) => c.curso === cursoFiltro) || cursos?.[0];
    if (!cursoObj) return null;
    return resumenPendientesCurso(cursoObj, alumnos || [], actividades || [], notas || {}, periodoFiltro);
  }, [actividades, alumnos, cursoFiltro, cursos, notas, periodoFiltro]);

  const alumnoDetalle = useMemo(() => {
    if (!resumenCurso?.porAlumno?.length) return null;
    return calcularPendientesAlumno(
      resumenCurso.porAlumno[0].alumno,
      cursoFiltro,
      actividades || [],
      notas || {},
      periodoFiltro
    );
  }, [actividades, cursoFiltro, notas, periodoFiltro, resumenCurso]);

  const exportarCsv = () => {
    if (!resumenCurso) return;
    const headers = ['N°', 'Alumno', 'Curso', 'Pendientes', 'Ausente Prueba', 'Entregadas', '% Cumplimiento'];
    const rows = (resumenCurso.porAlumno || []).map((item: any) => [
      item.alumno.numero,
      item.alumno.alumno,
      item.curso,
      item.totalPendientes,
      item.totalAusentesPrueba,
      item.totalEntregadas,
      `${item.porcentajeCumplimiento}%`
    ]);
    descargarCSVExcel(`Pendientes_${cursoFiltro}_${periodoFiltro}`.replace(/\s+/g, '_'), headers, rows);
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

      {!resumenCurso ? <div className="text-sm text-slate-500">Sin datos disponibles.</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="border rounded-lg p-3"><strong>{resumenCurso.totalActividades}</strong><div>Actividades</div></div>
            <div className="border rounded-lg p-3"><strong>{resumenCurso.totalPendientes}</strong><div>Pendientes</div></div>
            <div className="border rounded-lg p-3"><strong>{resumenCurso.totalEntregadas}</strong><div>Entregadas</div></div>
            <div className="border rounded-lg p-3"><strong>{resumenCurso.promedioCumplimiento}%</strong><div>Cumplimiento promedio</div></div>
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">N°</th>
                  <th className="p-2 text-left">Alumno</th>
                  <th className="p-2 text-left">Pendientes</th>
                  <th className="p-2 text-left">Ausente prueba</th>
                  <th className="p-2 text-left">Entregadas</th>
                  <th className="p-2 text-left">% Cumplimiento</th>
                </tr>
              </thead>
              <tbody>
                {(resumenCurso.porAlumno || []).map((item: any) => (
                  <tr key={item.alumno.numero} className="border-t">
                    <td className="p-2">{item.alumno.numero}</td>
                    <td className="p-2">{item.alumno.alumno}</td>
                    <td className="p-2">{item.totalPendientes}</td>
                    <td className="p-2">{item.totalAusentesPrueba}</td>
                    <td className="p-2">{item.totalEntregadas}</td>
                    <td className="p-2">{item.porcentajeCumplimiento}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {alumnoDetalle && (
            <div className="border rounded-lg p-3 space-y-2 text-sm">
              <div className="font-semibold">Ejemplo de comunicación a familia</div>
              <pre className="whitespace-pre-wrap bg-slate-50 p-2 rounded">{generarTextoFamiliaPendientes(alumnoDetalle)}</pre>
              <pre className="whitespace-pre-wrap bg-slate-50 p-2 rounded">{generarMailInformePendientes(alumnoDetalle).asunto}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};
