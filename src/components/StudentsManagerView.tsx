import React, { useState, useMemo } from 'react';
import { useSchool } from '../context/SchoolContext';
import { Alumno } from '../types';
import {
  Users,
  UserPlus,
  UserX,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Edit3
} from 'lucide-react';

export const StudentsManagerView: React.FC = () => {
  const {
    cursos,
    selectedCurso,
    setSelectedCurso,
    alumnos,
    agregarAlumno,
    editarAlumno,
    quitarAlumno,
    recargarAlumnosEmbebidos
  } = useSchool();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newNombre, setNewNombre] = useState<string>("");
  const [newNumero, setNewNumero] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newObs, setNewObs] = useState<string>("");

  // Modal para editar alumno
  const [editingStudent, setEditingStudent] = useState<Alumno | null>(null);
  const [editNombre, setEditNombre] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editObs, setEditObs] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Validación básica de email
  const isValidEmail = (emailStr: string): boolean => {
    const trimmed = emailStr.trim();
    if (!trimmed) return true; // es opcional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  // Suggested next number for this course
  const courseStudents = useMemo(() => {
    return alumnos
      .filter(a => a.curso === selectedCurso)
      .sort((a, b) => a.numero - b.numero);
  }, [alumnos, selectedCurso]);

  const suggestedNumber = useMemo(() => {
    return courseStudents.reduce((max, a) => Math.max(max, a.numero), 0) + 1;
  }, [courseStudents]);

  const filteredStudents = useMemo(() => {
    return courseStudents.filter(a => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        a.alumno.toLowerCase().includes(q) ||
        String(a.numero) === q ||
        (a.email && a.email.toLowerCase().includes(q))
      );
    });
  }, [courseStudents, searchTerm]);

  const handleOpenAddModal = () => {
    setNewNombre("");
    setNewNumero(String(suggestedNumber));
    setNewEmail("");
    setNewObs("");
    setFormError(null);
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      setFormError("El nombre y apellido es obligatorio.");
      return;
    }

    if (newEmail.trim() && !isValidEmail(newEmail)) {
      setFormError("El formato del correo electrónico no es válido (ej: nombre@dominio.com).");
      return;
    }

    const num = newNumero ? Number(newNumero) : suggestedNumber;
    const creado = agregarAlumno(
      selectedCurso,
      newNombre.trim(),
      num,
      newObs.trim(),
      newEmail.trim()
    );

    setFeedbackMsg(`✓ Alumno agregado: ${creado.alumno} (N° ${creado.numero}) en ${selectedCurso}`);
    setShowAddModal(false);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleOpenEditModal = (a: Alumno) => {
    setEditingStudent(a);
    setEditNombre(a.alumno);
    setEditEmail(a.email || "");
    setEditObs(a.observaciones || "");
    setFormError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (!editNombre.trim()) {
      setFormError("El nombre y apellido no puede estar vacío.");
      return;
    }

    if (editEmail.trim() && !isValidEmail(editEmail)) {
      setFormError("El formato del correo electrónico no es válido (ej: nombre@dominio.com).");
      return;
    }

    editarAlumno(editingStudent.curso, editingStudent.numero, {
      alumno: editNombre.trim(),
      email: editEmail.trim(),
      observaciones: editObs.trim()
    });

    setFeedbackMsg(`✓ Datos de ${editNombre.trim()} actualizados correctamente.`);
    setEditingStudent(null);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleDeactivate = (a: Alumno) => {
    quitarAlumno(a.curso, a.numero, 'desactivar');
    setFeedbackMsg(`Alumno ${a.alumno} desactivado.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleReactivate = (a: Alumno) => {
    agregarAlumno(a.curso, a.alumno, a.numero, a.observaciones, a.email);
    setFeedbackMsg(`Alumno ${a.alumno} reactivado.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDeletePermanent = (a: Alumno) => {
    if (confirm(`¿Estás seguro de borrar definitivamente a ${a.alumno} del curso ${a.curso}? Esta acción no se puede deshacer.`)) {
      quitarAlumno(a.curso, a.numero, 'borrar');
      setFeedbackMsg(`Alumno ${a.alumno} borrado definitivamente.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 puedow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Gestión de Alumnos y Matrícula</span>
          </h2>
          <p className="text-xs text-slate-500">
            Administra los alumnos inscriptos en <strong>{selectedCurso}</strong> ({courseStudents.length} registrados).
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg puedow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Alumno</span>
          </button>

          <button
            onClick={() => {
              if (confirm("¿Restaurar la lista original de alumnos embebidos de los scripts? Se sobrescribirá el roster actual.")) {
                recargarAlumnosEmbebidos();
                setFeedbackMsg("✓ Alumnos originales restaurados.");
                setTimeout(() => setFeedbackMsg(null), 4000);
              }
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Restaura la nómina original inicial de los 5 cursos"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Recargar Alumnos Originales</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 puedow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="student-search-input"
            name="student-search-input"
            type="text"
            placeholder="Buscar por apellido, nombre, N° o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>

        <div className="text-xs text-slate-500">
          Mostrando <strong>{filteredStudents.length}</strong> de {courseStudents.length} alumnos
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 puedow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
              <tr>
                <th className="py-3 px-3 w-14 text-center">N°</th>
                <th className="py-3 px-4 min-w-[200px]">Apellido y Nombre</th>
                <th className="py-3 px-4 min-w-[200px]">Correo Electrónico (Email)</th>
                <th className="py-3 px-4 min-w-[180px]">Observaciones</th>
                <th className="py-3 px-3 w-28 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron alumnos con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(a => (
                  <tr key={a.numero} className={`hover:bg-slate-50 ${!a.activo ? 'opacity-50 bg-slate-50/50' : ''}`}>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                      {a.numero}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {a.alumno}
                    </td>
                    <td className="py-2.5 px-4">
                      {a.email ? (
                        <a
                          href={`mailto:${a.email}`}
                          className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline font-mono text-[11px]"
                          title={`Enviar correo a ${a.email}`}
                        >
                          <Mail className="w-3 h-3 text-blue-500" />
                          <span>{a.email}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin email</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 italic">
                      {a.observaciones || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {a.activo ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Activo
                        </span>
                      ) : (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Inactivo / Baja
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(a)}
                        className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center space-x-1 border border-transparent hover:border-blue-200"
                        title="Editar datos y correo del alumno"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium hidden sm:inline">Editar</span>
                      </button>

                      {a.activo ? (
                        <button
                          onClick={() => handleDeactivate(a)}
                          className="px-2 py-1 rounded text-[11px] font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors"
                          title="Desactivar (conserva notas y asistencia)"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(a)}
                          className="px-2 py-1 rounded text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                        >
                          Reactivar
                        </button>
                      )}

                      <button
                        onClick={() => handleDeletePermanent(a)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                        title="Borrar definitivamente"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 puedow-xl p-5 space-y-4 text-xs animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Agregar Alumno a {selectedCurso}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg flex items-center space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="student-name-input" className="font-bold text-slate-700 block mb-1">
                  Apellido y Nombre:
                </label>
                <input
                  id="student-name-input"
                  type="text"
                  required
                  placeholder="Ej: Gómez, Martín"
                  value={newNombre}
                  onChange={(e) => {
                    setNewNombre(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="student-email-input" className="font-bold text-slate-700 block mb-1">
                  Correo Electrónico (opcional):
                </label>
                <input
                  id="student-email-input"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Permite enviar el informe de actividades adeudadas directamente por mail.
                </span>
              </div>

              <div>
                <label htmlFor="student-number-input" className="font-bold text-slate-700 block mb-1">
                  Número de lista (N°):
                </label>
                <input
                  id="student-number-input"
                  type="number"
                  required
                  value={newNumero}
                  onChange={(e) => setNewNumero(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-bold text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Sugerido automáticamente: {suggestedNumber}
                </span>
              </div>

              <div>
                <label htmlFor="student-obs-input" className="font-bold text-slate-700 block mb-1">
                  Observaciones (opcional):
                </label>
                <input
                  id="student-obs-input"
                  type="text"
                  placeholder="Ej: Ingresó el 15/04 o promotora"
                  value={newObs}
                  onChange={(e) => setNewObs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Guardar Alumno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 puedow-xl p-5 space-y-4 text-xs animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Editar Alumno: N° {editingStudent.numero}</span>
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg flex items-center space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="edit-student-name" className="font-bold text-slate-700 block mb-1">
                  Apellido y Nombre:
                </label>
                <input
                  id="edit-student-name"
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => {
                    setEditNombre(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-student-email" className="font-bold text-slate-700 block mb-1">
                  Correo Electrónico (Email):
                </label>
                <input
                  id="edit-student-email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Utilizado para enviar el informe de actividades pendientes por correo.
                </span>
              </div>

              <div>
                <label htmlFor="edit-student-obs" className="font-bold text-slate-700 block mb-1">
                  Observaciones:
                </label>
                <input
                  id="edit-student-obs"
                  type="text"
                  placeholder="Observaciones adicionales"
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
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
    </div>
  );
};

