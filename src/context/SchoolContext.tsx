import React, { createContext, useContext, useMemo, useState } from 'react';
import { ALUMNOS_INICIALES, CURSOS_INICIALES, DIAS_NO_CLASE_INICIALES, MESES_2026 } from '../data/initialData';
import { Curso, Alumno, MesEscolar, DiaNoClase, RegistroAsistencia } from '../types';

type DemoUser = { email: string };

type SchoolContextValue = {
  user: DemoUser | null;
  loadingAuth: boolean;
  login: () => void;
  logout: () => void;
  syncState: string;
  cursos: Curso[];
  alumnos: Alumno[];
  meses: MesEscolar[];
  diasNoClase: DiaNoClase[];
  asistencias: Record<string, RegistroAsistencia>;
  selectedCurso: string;
  setSelectedCurso: (curso: string) => void;
  upsertAsistencias: (items: RegistroAsistencia[]) => void;
  marcarDiaNC: (curso: string, fecha: string, bloque: string) => void;
  marcarDiaP: (curso: string, fecha: string, bloque: string) => void;
  lastSaved: string;
};

const noop = () => {};

const SchoolContext = createContext<SchoolContextValue>({
  // TODO(restauracion): src/context/SchoolContext.tsx original no disponible en _staging.
  user: { email: 'demo@local' },
  loadingAuth: false,
  login: noop,
  logout: noop,
  syncState: 'Modo demo (sin sincronización en la nube)',
  cursos: CURSOS_INICIALES,
  alumnos: ALUMNOS_INICIALES,
  meses: MESES_2026,
  diasNoClase: DIAS_NO_CLASE_INICIALES,
  asistencias: {},
  selectedCurso: CURSOS_INICIALES[0]?.curso || '',
  setSelectedCurso: noop,
  upsertAsistencias: noop,
  marcarDiaNC: noop,
  marcarDiaP: noop,
  lastSaved: ''
});

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [selectedCurso, setSelectedCurso] = useState<string>(CURSOS_INICIALES[0]?.curso || '');
  const [asistencias, setAsistencias] = useState<Record<string, RegistroAsistencia>>({});
  const [diasNoClase, setDiasNoClase] = useState<DiaNoClase[]>(DIAS_NO_CLASE_INICIALES);

  const value = useMemo<SchoolContextValue>(() => ({
    user: { email: 'demo@local' },
    loadingAuth: false,
    login: noop,
    logout: noop,
    syncState: 'Modo demo (sin sincronización en la nube)',
    cursos: CURSOS_INICIALES,
    alumnos: ALUMNOS_INICIALES,
    meses: MESES_2026,
    diasNoClase,
    asistencias,
    selectedCurso,
    setSelectedCurso,
    upsertAsistencias: (items: RegistroAsistencia[]) => {
      if (!items.length) return;
      setAsistencias(prev => {
        const next = { ...prev };
        for (const item of items) {
          next[item.clave] = item;
        }
        return next;
      });
    },
    marcarDiaNC: (_curso: string, fecha: string, _bloque: string) => {
      setDiasNoClase(prev => (prev.some(d => d.fecha === fecha) ? prev : [...prev, { fecha, motivo: 'Sin clases' }]));
    },
    marcarDiaP: (curso: string, fecha: string, bloque: string) => {
      setDiasNoClase(prev => prev.filter(d => d.fecha !== fecha));
      const alumnosCurso = ALUMNOS_INICIALES.filter(a => a.curso === curso && a.activo);
      setAsistencias(prev => {
        const next = { ...prev };
        for (const alumno of alumnosCurso) {
          const clave = `${curso}|${alumno.numero}|${fecha}|${bloque}`;
          next[clave] = {
            clave,
            curso,
            numero: alumno.numero,
            alumno: alumno.alumno,
            fecha,
            dia: new Date(fecha).toLocaleDateString('es-AR', { weekday: 'long' }),
            mes: 'Mes',
            bimestre: 'Bimestre',
            bloque,
            estado: 'P',
            actualizado: new Date().toISOString()
          };
        }
        return next;
      });
    },
    lastSaved: ''
  }), [asistencias, diasNoClase, selectedCurso]);

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  return useContext(SchoolContext);
}
