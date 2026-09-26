import React from 'react';

export function ActivitiesManagerView({
  isCreateModalOpen,
  setIsCreateModalOpen,
}: {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
      {/* TODO(restauracion): src/components/ActivitiesManagerView.tsx original no disponible en _staging. */}
      <p className="mb-3">Gestor de actividades pendiente de restauración completa.</p>
      <button onClick={() => setIsCreateModalOpen(!isCreateModalOpen)} className="text-indigo-700 underline">
        {isCreateModalOpen ? 'Cerrar modal demo' : 'Abrir modal demo'}
      </button>
    </div>
  );
}
