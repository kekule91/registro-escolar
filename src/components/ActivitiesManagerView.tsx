import React, { useState } from 'react';
import { useSchool } from '../context/SchoolContext';
import { Actividad, TipoActividad, PeriodoNotas } from '../types';
import {
  TIPOS_ACTIVIDAD,
  PERIODOS_NOTAS,
  escalaPorTipoPeriodo
} from '../utils/gradeEngine';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  BookOpen
} from 'lucide-react';

interface ActivitiesManagerViewProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const ActivitiesManagerView: React.FC<ActivitiesManagerViewProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen
}) => {
  const {
    cursos,
    selectedCurso,
    actividades,
    crearActividad,
    editarActividad,
    desactivarActividad,
    borrarActividadDefinitivo
  } = useSchool();

  // Create Form State
  const [targetCursos, setTargetCursos] = useState<string[]>([selectedCurso]);
  const [selectAllCursos, setSelectAllCursos] = useState<boolean>(false);
  const [nombre, setNombre] = useState<string>("");
  const [tipo, setTipo] = useState<TipoActividad>("Trabajo práctico");
  const [periodo, setPeriodo] = useState<PeriodoNotas>("1° bimestre");
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState<string>("");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  // Edit State
  const [editingAct, setEditingAct] = useState<Actividad | null>(null);
  const [editNombre, setEditNombre] = useState<string>("");
  const [editTipo, setEditTipo] = useState<TipoActividad>("Trabajo práctico");
  const [editPeriodo, setEditPeriodo] = useState<PeriodoNotas>("1° bimestre");
  const [editFecha, setEditFecha] = useState<string>("");
  const [editActiva, setEditActiva] = useState<boolean>(true);
  const [editObs, setEditObs] = useState<string>("");

  // Delete Confirm State
  const [deletingAct, setDeletingAct] = useState<Actividad | null>(null);

  const previewEscala = escalaPorTipoPeriodo(tipo, periodo);
  const editPreviewEscala = editingAct ? escalaPorTipoPeriodo(editTipo, editPeriodo) : "";

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectAllCursos(checked);
    if (checked) {
      setTargetCursos(cursos.map(c => c.curso));
    } else {
      setTargetCursos([selectedCurso]);
    }
  };

  const handleCourseCheckbox = (cursoNombre: string) => {
    if (targetCursos.includes(cursoNombre)) {
      if (targetCursos.length > 1) {
        setTargetCursos(targetCursos.filter(c => c !== cursoNombre));
      }
    } else {
      setTargetCursos([...targetCursos, cursoNombre]);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const creadas = crearActividad({
      cursos: targetCursos,
      nombre: nombre.trim(),
      tipo,
      periodo,
      fecha,
      observaciones: observaciones.trim()
    });

    setCreateMsg(`✓ Actividad creada exitosamente para ${creadas.length} curso(s).`);
    setNombre("");
    setObservaciones("");
    setTimeout(() => {
      setCreateMsg(null);
      setIsCreateModalOpen(false);
    }, 1500);
  };

  const handleOpenEdit = (act: Actividad) => {
    setEditingAct(act);
    setEditNombre(act.nombre);
    setEditTipo(act.tipo);
    setEditPeriodo(act.periodo);
    setEditFecha(act.fecha || "");
    setEditActiva(act.activa);
    setEditObs(act.observaciones || "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAct || !editNombre.trim()) return;

    editarActividad({
      ...editingAct,
      nombre: editNombre.trim(),
      tipo: editTipo,
      periodo: editPeriodo,
      fecha: editFecha,
      activa: editActiva,
      escala: (editPreviewEscala || editingAct.escala) as any,
      observaciones: editObs.trim()
    });

    setEditingAct(null);
  };

  const currentCourseActs = actividades.filter(a => a.curso === selectedCurso);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Gestión de Actividades, TPs y Evaluaciones</span>
          </h2>
          <p className="text-xs text-slate-500">
            Crea, edita o desactiva actividades para <strong>{selectedCurso}</strong> o en carga múltiple para varios cursos.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Actividad</span>
        </button>
      </div>

      {/* Table of Activities for Current Course */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
              <tr>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Período</th>
                <th className="py-3 px-3">Escala</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {currentCourseActs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No hay actividades registradas en {selectedCurso}. Haz clic en "Crear Nueva Actividad".
                  </td>
                </tr>
              ) : (
                currentCourseActs.map(act => (
                  <tr key={act.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {act.nombre}
                      {act.observaciones && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          {act.observaciones}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {act.tipo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {act.periodo}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                      {act.escala}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {act.fecha || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {act.activa ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Activa
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Desactivada
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(act)}
                        className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                        title="Editar actividad"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingAct(act)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                        title="Borrar o desactivar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Nueva Actividad, TP o Prueba</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {createMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{createMsg}</span>
                </div>
              )}

              {/* Multi Course Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Cursos a asignar:
                </label>
                <div className="flex items-center space-x-2 mb-2">
                  <label htmlFor="select-all-courses" className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      id="select-all-courses"
                      name="select-all-courses"
                      type="checkbox"
                      checked={selectAllCursos}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-semibold text-blue-700">TODOS los cursos</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cursos.map(c => (
                    <label
                      key={c.curso}
                      className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer font-medium transition-colors ${
                        targetCursos.includes(c.curso)
                          ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        id={`course-checkbox-${c.curso}`}
                        name={`course-checkbox-${c.curso}`}
                        type="checkbox"
                        checked={targetCursos.includes(c.curso)}
                        onChange={() => handleCourseCheckbox(c.curso)}
                        className="sr-only"
                      />
                      <span>{c.curso}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="activity-name-input" className="font-bold text-slate-700 block mb-1">
                  Nombre de la actividad / TP / prueba:
                </label>
                <input
                  id="activity-name-input"
                  type="text"
                  required
                  placeholder="Ej: TP N°2: Lectura y análisis de textos"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="activity-type-input" className="font-bold text-slate-700 block mb-1">Tipo de evaluación:</label>
                  <select
                    id="activity-type-input"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoActividad)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-medium"
                  >
                    {TIPOS_ACTIVIDAD.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="activity-period-input" className="font-bold text-slate-700 block mb-1">Período / Bimestre:</label>
                  <select
                    id="activity-period-input"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value as PeriodoNotas)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-medium"
                  >
                    {PERIODOS_NOTAS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Scale Preview */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="activity-date-input" className="font-bold text-slate-700 block mb-1">Fecha:</label>
                  <input
                    id="activity-date-input"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-medium"
                  />
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">Escala resultante:</span>
                  <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 font-mono text-[11px] font-bold text-blue-700">
                    {previewEscala || "No válida"}
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div>
                <label htmlFor="activity-obs-input" className="font-bold text-slate-700 block mb-1">Observaciones (opcional):</label>
                <input
                  id="activity-obs-input"
                  type="text"
                  placeholder="Ej: Entrega individual obligatoria"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!previewEscala}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  Crear Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingAct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Editar Actividad ({editingAct.curso})</span>
              </h3>
              <button
                onClick={() => setEditingAct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label htmlFor="edit-activity-name-input" className="font-bold text-slate-700 block mb-1">Nombre:</label>
                <input
                  id="edit-activity-name-input"
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-activity-type-input" className="font-bold text-slate-700 block mb-1">Tipo:</label>
                  <select
                    id="edit-activity-type-input"
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as TipoActividad)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  >
                    {TIPOS_ACTIVIDAD.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-activity-period-input" className="font-bold text-slate-700 block mb-1">Período:</label>
                  <select
                    id="edit-activity-period-input"
                    value={editPeriodo}
                    onChange={(e) => setEditPeriodo(e.target.value as PeriodoNotas)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  >
                    {PERIODOS_NOTAS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-activity-date-input" className="font-bold text-slate-700 block mb-1">Fecha:</label>
                  <input
                    id="edit-activity-date-input"
                    type="date"
                    value={editFecha}
                    onChange={(e) => setEditFecha(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="edit-activity-active-input" className="font-bold text-slate-700 block mb-1">Estado:</label>
                  <select
                    id="edit-activity-active-input"
                    value={editActiva ? "true" : "false"}
                    onChange={(e) => setEditActiva(e.target.value === "true")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  >
                    <option value="true">Activa</option>
                    <option value="false">Desactivada</option>
                  </select>
                </div>
              </div>

              {editPreviewEscala !== editingAct.escala && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Aviso de escala:</strong> Cambiarás de <code>{editingAct.escala}</code> a <code>{editPreviewEscala}</code>. Las notas ya cargadas incompatibles se limpiarán automáticamente.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingAct(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / DEACTIVATE CONFIRMATION DIALOG */}
      {deletingAct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-5 space-y-4 text-xs animate-scaleUp">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">¿Qué deseas hacer con la actividad?</h3>
            </div>

            <p className="text-slate-600 leading-relaxed">
              <strong>{deletingAct.nombre}</strong> ({deletingAct.curso})
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  desactivarActividad(deletingAct.id);
                  setDeletingAct(null);
                }}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <strong className="block text-slate-900 font-semibold mb-0.5">1. Desactivar (Recomendado)</strong>
                <span className="text-[11px] text-slate-500">
                  Deja de aparecer en las listas activas, pero conserva todas sus calificaciones registradas.
                </span>
              </button>

              <button
                onClick={() => {
                  if (confirm(`¿Confirmas borrar definitivamente "${deletingAct.nombre}" y todas sus notas asociadas? Esta acción no se puede deshacer.`)) {
                    borrarActividadDefinitivo(deletingAct.id);
                    setDeletingAct(null);
                  }
                }}
                className="w-full text-left p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-colors"
              >
                <strong className="block text-rose-900 font-semibold mb-0.5">2. Borrar Definitivamente</strong>
                <span className="text-[11px] text-rose-600">
                  Elimina la actividad y todas sus notas cargadas de la base de datos de forma permanente.
                </span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDeletingAct(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
