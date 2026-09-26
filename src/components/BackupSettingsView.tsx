import React, { useState, useRef } from 'react';
import { useSchool } from '../context/SchoolContext';
import { fmtFecha } from '../utils/attendanceEngine';
import {
  obtenerUmbralesAusentismo,
  guardarUmbralesAusentismo,
  UMBRALES_DEFAULT,
  UmbralesAusentismo
} from '../utils/informes';
import {
  Download,
  Upload,
  RotateCcw,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Database,
  Sliders,
  Save
} from 'lucide-react';

export const BackupSettingsView: React.FC = () => {
  const {
    alumnos,
    actividades,
    notas,
    asistencias,
    bimestres,
    diasNoClase,
    exportarBackupJSON,
    importarBackupJSON,
    resetearDatosIniciales
  } = useSchool();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Umbrales configurables de ausentismo
  const [umbrales, setUmbrales] = useState<UmbralesAusentismo>(() => obtenerUmbralesAusentismo());

  const handleSaveUmbrales = () => {
    guardarUmbralesAusentismo(umbrales);
    setMessage({ type: 'success', text: "✓ Umbrales de ausentismo guardados correctamente." });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleResetUmbrales = () => {
    setUmbrales({ ...UMBRALES_DEFAULT });
    guardarUmbralesAusentismo({ ...UMBRALES_DEFAULT });
    setMessage({ type: 'success', text: "✓ Umbrales restablecidos a los valores por defecto (5 faltas / 85% y 10 faltas / 75%)." });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportarBackupJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_RegistroEscolar_2026_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage({ type: 'success', text: "✓ Respaldo JSON descargado correctamente." });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importarBackupJSON(content);
        if (res.success) {
          setMessage({ type: 'success', text: `✓ ${res.message}` });
        } else {
          setMessage({ type: 'error', text: `✗ ${res.message}` });
        }
        setTimeout(() => setMessage(null), 5000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportCSVNotas = () => {
    const headers = ["Clave", "ActividadID", "Curso", "N°", "Alumno", "Tipo", "Periodo", "Actividad", "Fecha", "Escala", "Nota", "Nota_Normalizada", "Observación", "Actualizado", "Origen"];
    const rows = Object.values(notas).map(n => [
      `"${n.clave}"`,
      `"${n.actividadId}"`,
      `"${n.curso}"`,
      n.numero,
      `"${n.alumno}"`,
      `"${n.tipo}"`,
      `"${n.periodo}"`,
      `"${n.actividad}"`,
      `"${n.fecha || ''}"`,
      `"${n.escala}"`,
      `"${n.nota}"`,
      `"${n.notaNormalizada}"`,
      `"${n.observacion || ''}"`,
      `"${n.actualizado}"`,
      `"${n.origen || ''}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Notas_Base_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: "✓ Base de Notas exportada a CSV." });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleExportCSVAsistencia = () => {
    const headers = ["Clave", "Curso", "N°", "Alumno", "Fecha", "Día", "Mes", "Bloque", "Estado", "Actualizado"];
    const rows = Object.values(asistencias).map(a => [
      `"${a.clave}"`,
      `"${a.curso}"`,
      a.numero,
      `"${a.alumno}"`,
      `"${a.fecha}"`,
      `"${a.dia}"`,
      `"${a.mes}"`,
      `"${a.bloque}"`,
      `"${a.estado}"`,
      `"${a.actualizado}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Asistencia_Base_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: "✓ Base de Asistencia exportada a CSV." });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleExportCSVAlumnos = () => {
    if (alumnos.length === 0) {
      setMessage({ type: 'error', text: "No hay alumnos registrados para exportar." });
      return;
    }

    const headers = ["Curso", "Numero", "Apellido y Nombre", "Email", "Estado", "Observaciones"];
    const rows = alumnos.map(a => [
      `"${a.curso}"`,
      a.numero,
      `"${a.alumno.replace(/"/g, '""')}"`,
      `"${(a.email || '').replace(/"/g, '""')}"`,
      `"${a.activo ? 'Activo' : 'Inactivo'}"`,
      `"${(a.observaciones || '').replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nomina_Alumnos_Contacto_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: "✓ Nómina de Alumnos y Contacto exportada a CSV." });
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Copias de Seguridad, Exportación y Calendario Escolar</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Guarda copias de seguridad de todas las calificaciones y asistencias en tu computadora, o restaura un respaldo previo.
        </p>

        {/* Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block font-medium">Alumnos:</span>
            <span className="text-lg font-bold text-slate-800">{alumnos.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block font-medium">Actividades:</span>
            <span className="text-lg font-bold text-slate-800">{actividades.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block font-medium">Notas registradas:</span>
            <span className="text-lg font-bold text-blue-600">{Object.keys(notas).length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block font-medium">Asistencias registradas:</span>
            <span className="text-lg font-bold text-emerald-600">{Object.keys(asistencias).length}</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Export */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <Download className="w-4 h-4 text-blue-600" />
            <span>Crear Copia de Seguridad</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Descarga un archivo completo en formato JSON con la nómina de alumnos, actividades, notas y marcas de presentismo.
          </p>

          <div className="pt-2">
            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Respaldo Completo (.JSON)</span>
            </button>
          </div>
        </div>

        {/* Restore */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Restaurar desde Respaldo</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Selecciona un archivo <code>.json</code> previamente exportado para recuperar todos los datos.
          </p>

          <input
            id="backup-file-input"
            name="backup-file-input"
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Subir y Restaurar Archivo (.JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV Export Options */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-slate-700" />
          <span>Exportar Planillas en Formato CSV (Excel / Google Sheets)</span>
        </h3>
        <p className="text-xs text-slate-500">
          Descarga archivos tabulares compatibles con Excel y Google Sheets con los registros acumulados del ciclo 2026.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportCSVNotas}
            className="flex items-center space-x-2 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Exportar Base de Notas (CSV)</span>
          </button>

          <button
            onClick={handleExportCSVAsistencia}
            className="flex items-center space-x-2 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Base de Asistencia (CSV)</span>
          </button>

          <button
            onClick={handleExportCSVAlumnos}
            className="flex items-center space-x-2 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <span>Exportar Nómina de Alumnos y Correos (CSV)</span>
          </button>
        </div>
      </div>

      {/* Configuración de Umbrales de Ausentismo */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Umbrales de Alertas de Ausentismo (Semáforo)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Define los límites para activar las alertas amarilla y roja en los informes de ausentismo individuales y por curso.
            </p>
          </div>
          <button
            onClick={handleResetUmbrales}
            className="text-xs text-slate-500 hover:text-slate-800 underline flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer por defecto</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Alerta Amarilla */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <strong className="text-amber-900 font-bold uppercase text-[11px] tracking-wide">
                Alerta Amarilla (Atención Moderada)
              </strong>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Se activa si el estudiante alcanza la cantidad de inasistencias indicada <strong>O</strong> si su asistencia cae por debajo del porcentaje:
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Inasistencias (≥)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={umbrales.amarillaInasistencias}
                  onChange={(e) => setUmbrales({ ...umbrales, amarillaInasistencias: Number(e.target.value) || 0 })}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  % Asistencia (&lt;)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={umbrales.amarillaPorcentaje}
                    onChange={(e) => setUmbrales({ ...umbrales, amarillaPorcentaje: Number(e.target.value) || 0 })}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono font-bold text-slate-800 pr-7"
                  />
                  <span className="absolute right-2.5 top-2 text-slate-400 font-mono font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerta Roja */}
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <strong className="text-rose-900 font-bold uppercase text-[11px] tracking-wide">
                Alerta Roja (Atención Prioritaria / Crítica)
              </strong>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Se activa si el estudiante acumula la cantidad crítica de inasistencias <strong>O</strong> si el porcentaje es menor al límite:
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Inasistencias (≥)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={umbrales.rojaInasistencias}
                  onChange={(e) => setUmbrales({ ...umbrales, rojaInasistencias: Number(e.target.value) || 0 })}
                  className="w-full bg-white border border-rose-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  % Asistencia (&lt;)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={umbrales.rojaPorcentaje}
                    onChange={(e) => setUmbrales({ ...umbrales, rojaPorcentaje: Number(e.target.value) || 0 })}
                    className="w-full bg-white border border-rose-300 rounded-lg p-2 font-mono font-bold text-slate-800 pr-7"
                  />
                  <span className="absolute right-2.5 top-2 text-slate-400 font-mono font-bold">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSaveUmbrales}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración de Umbrales</span>
          </button>
        </div>
      </div>

      {/* Academic Calendar 2026 Reference */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Cronograma Escolar 2026 Oficial</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Bimestres */}
          <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
            <span className="font-bold text-slate-800 block mb-2">Bimestres y Cuatrimestres:</span>
            <div className="space-y-1.5">
              {bimestres.map(b => (
                <div key={b.nombre} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                  <span className="font-medium text-slate-700">{b.nombre}</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {fmtFecha(b.inicio)} al {fmtFecha(b.fin)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Días no clase */}
          <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
            <span className="font-bold text-slate-800 block mb-2">Receso y Feriados Programados:</span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {diasNoClase.map(d => (
                <div key={d.fecha} className="flex justify-between items-center py-0.5 text-[11px]">
                  <span className="text-slate-600">{d.motivo}</span>
                  <span className="font-mono text-slate-500 font-medium">{fmtFecha(d.fecha)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Factory Reset */}
      <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <strong className="text-rose-900 font-bold block">Restablecer datos de fábrica</strong>
          <span className="text-rose-700 text-[11px]">
            Restaura la aplicación con los alumnos y configuración iniciales de los Apps Scripts.
          </span>
        </div>

        <button
          onClick={() => {
            if (confirm("¿Estás seguro de reiniciar la aplicación a sus datos iniciales? Se perderán las modificaciones no respaldadas.")) {
              resetearDatosIniciales();
              setMessage({ type: 'success', text: "✓ Datos reiniciados al estado original." });
              setTimeout(() => setMessage(null), 3000);
            }
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar a Datos Iniciales</span>
        </button>
      </div>
    </div>
  );
};
