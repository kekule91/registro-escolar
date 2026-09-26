import React from 'react';

export function ClassFollowUpView({ onNavigateToAttendance }: { onNavigateToAttendance: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* TODO(restauracion): src/components/ClassFollowUpView.tsx original no disponible en _staging. */}
      <p className="text-sm text-slate-700 mb-3">Seguimiento de clase pendiente de restauración completa.</p>
      <button onClick={onNavigateToAttendance} className="text-sm text-indigo-700 underline">Ir a presentismo</button>
    </div>
  );
}
