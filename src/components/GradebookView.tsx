import React from 'react';

export function GradebookView({ onOpenNewActivityModal }: { onOpenNewActivityModal: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* TODO(restauracion): src/components/GradebookView.tsx original no disponible en _staging. */}
      <p className="text-sm text-slate-700 mb-3">Vista de notas pendiente de restauración completa.</p>
      <button onClick={onOpenNewActivityModal} className="text-sm text-indigo-700 underline">Abrir actividades</button>
    </div>
  );
}
