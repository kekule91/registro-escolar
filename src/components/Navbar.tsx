import React from 'react';
import { useSchool } from '../context/SchoolContext';
import {
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  BookOpen,
  Users,
  FileSpreadsheet,
  Settings,
  CheckCircle2,
  Clock
} from 'lucide-react';

export type MainTab = 'notas' | 'presentismo' | 'seguimiento' | 'informes' | 'actividades' | 'alumnos' | 'forms' | 'configuracion';

interface NavbarProps {
  currentTab: MainTab;
  setCurrentTab: (tab: MainTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { cursos, selectedCurso, setSelectedCurso, lastSaved } = useSchool();

  const navItems: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: 'notas', label: 'Carga de Notas', icon: GraduationCap },
    { id: 'presentismo', label: 'Presentismo', icon: CalendarCheck },
    { id: 'seguimiento', label: 'Seguimiento de Clase', icon: ClipboardList },
    { id: 'informes', label: 'Informes & Sugerencias', icon: BarChart3 },
    { id: 'actividades', label: 'Actividades', icon: BookOpen },
    { id: 'alumnos', label: 'Alumnos', icon: Users },
    { id: 'forms', label: 'Importar Forms', icon: FileSpreadsheet },
    { id: 'configuracion', label: 'Respaldos & Ajustes', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
      {/* Top row: Brand + Course Selector + Auto-save badge */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Registro Escolar 2026
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sistema de Notas Ponderadas & Presentismo por Bloques
              </p>
            </div>
          </div>

          {/* Quick Course Selector Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Curso:
            </span>
            {cursos.map(c => {
              const isSelected = c.curso === selectedCurso;
              return (
                <button
                  key={c.curso}
                  onClick={() => setSelectedCurso(c.curso)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs scale-102'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.curso}
                </button>
              );
            })}
          </div>

          {/* Save status badge */}
          <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-500">
            {lastSaved ? (
              <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guardado {lastSaved}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Sistema sincronizado</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
