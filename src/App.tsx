/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { Navbar, MainTab } from './components/Navbar';
import { GradebookView } from './components/GradebookView';
import { AttendanceView } from './components/AttendanceView';
import { ClassFollowUpView } from './components/ClassFollowUpView';
import { ReportsView } from './components/ReportsView';
import { ActivitiesManagerView } from './components/ActivitiesManagerView';
import { StudentsManagerView } from './components/StudentsManagerView';
import { FormsImporterView } from './components/FormsImporterView';
import { BackupSettingsView } from './components/BackupSettingsView';
import { LogIn, Loader2, Cloud, LogOut } from 'lucide-react';

export default function App() {
  return (
    <SchoolProvider>
      <AuthWrapper />
    </SchoolProvider>
  );
}

function AuthWrapper() {
  const { user, loadingAuth, login, logout, syncState } = useSchool();

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Cloud className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Registro Escolar 2026</h1>
          <p className="text-slate-600 mb-8">
            Inicia sesión para sincronizar tus registros de notas y presentismo en la nube.
          </p>
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Ingresar con Google
          </button>
        </div>
      </div>
    );
  }

  return <MainApp user={user} logout={logout} syncState={syncState} />;
}

function MainApp({ user, logout, syncState }: { user: any, logout: () => void, syncState: string }) {
  const [currentTab, setCurrentTab] = useState<MainTab>('notas');
  const [isCreateActivityModalOpen, setIsCreateActivityModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Sync & Auth Bar */}
      <div className="bg-indigo-900 text-indigo-100 py-1.5 px-4 text-xs font-medium flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2">
          <Cloud className="w-3.5 h-3.5" />
          {syncState}
        </div>
        <div className="flex items-center gap-4">
          <span>{user.email}</span>
          <button onClick={logout} className="flex items-center gap-1 hover:text-white transition-colors" title="Cerrar sesión">
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 print:p-0 print:max-w-none print:m-0">
        {currentTab === 'notas' && (
          <GradebookView
            onOpenNewActivityModal={() => {
              setCurrentTab('actividades');
              setIsCreateActivityModalOpen(true);
            }}
          />
        )}

        {currentTab === 'presentismo' && <AttendanceView />}

        {currentTab === 'seguimiento' && (
          <ClassFollowUpView onNavigateToAttendance={() => setCurrentTab('presentismo')} />
        )}

        {currentTab === 'informes' && <ReportsView />}

        {currentTab === 'actividades' && (
          <ActivitiesManagerView
            isCreateModalOpen={isCreateActivityModalOpen}
            setIsCreateModalOpen={setIsCreateActivityModalOpen}
          />
        )}

        {currentTab === 'alumnos' && <StudentsManagerView />}

        {currentTab === 'forms' && <FormsImporterView />}

        {currentTab === 'configuracion' && <BackupSettingsView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sistema Escolar 2026 • Equivalente Web de Apps Script Notas y Presentismo
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Zona horaria: America/Argentina/Buenos_Aires
          </span>
        </div>
      </footer>
    </div>
  );
}
