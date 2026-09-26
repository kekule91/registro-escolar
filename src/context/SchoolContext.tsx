import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, doc, writeBatch, onSnapshot, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { isFirebaseConfigured, auth, db } from '../firebase';
import {
  Curso,
  Alumno,
  Actividad,
  RegistroNota,
  RegistroAsistencia,
  DiaNoClase,
  Bimestre,
  MesEscolar,
  PeriodoNotas,
  EscalaNotas,
  TipoActividad,
  SeguimientoClase
} from '../types';
import { keySeguimiento } from '../utils/followUpEngine';
import {
  CURSOS_INICIALES,
  ALUMNOS_INICIALES,
  BIMESTRES_2026,
  MESES_2026,
  DIAS_NO_CLASE_INICIALES,
  ACTIVIDADES_INICIALES,
  REGISTROS_NOTAS_INICIALES,
  SEGUIMIENTOS_INICIALES
} from '../data/initialData';
import {
  normalizarNotaPorEscala,
  notaOrden,
  convertirPuntajeFormsAConceptual,
  escalaPorTipoPeriodo
} from '../utils/gradeEngine';
import {
  keyAsistencia,
  nombreDia,
  parseYmd,
  normalizarEstadoPresentismo
} from '../utils/attendanceEngine';

interface SchoolContextType {
  user: User | null;
  loadingAuth: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  syncState: string;

  cursos: Curso[];
  selectedCurso: string;
  setSelectedCurso: (c: string) => void;
  alumnos: Alumno[];
  actividades: Actividad[];
  notas: Record<string, RegistroNota>;
  asistencias: Record<string, RegistroAsistencia>;
  seguimientos: Record<string, SeguimientoClase>;
  diasNoClase: DiaNoClase[];
  bimestres: Bimestre[];
  meses: MesEscolar[];
  lastSaved: string;

  // Grade methods
  upsertNotas: (nuevas: RegistroNota[]) => void;
  marcarPendientesActividad: (actividadId: string, curso: string) => number;
  crearActividad: (data: {
    cursos: string[];
    nombre: string;
    tipo: TipoActividad;
    periodo: PeriodoNotas;
    fecha?: string;
    escala?: EscalaNotas;
    observaciones?: string;
  }) => Actividad[];
  editarActividad: (actividad: Actividad) => { actualizadas: number; incompatibles: number };
  desactivarActividad: (actividadId: string) => void;
  borrarActividadDefinitivo: (actividadId: string) => void;
  guardarNotasBimestralesCurso: (
    cursoNombre: string,
    periodo: PeriodoNotas,
    notasPorNumero: Record<number, string>
  ) => { total: number; invalidas: number };
  importarNotasForms: (
    cursoNombre: string,
    actividadId: string,
    datos: Array<{ numero?: number; nombre?: string; puntaje: number | string; obs?: string }>
  ) => { procesados: number; duplicados: number; noEncontrados: number };

  // Attendance methods
  upsertAsistencias: (nuevas: RegistroAsistencia[]) => void;
  marcarDiaNC: (curso: string, fechaYmd: string, bloque: string) => void;
  marcarDiaP: (curso: string, fechaYmd: string, bloque: string) => void;

  // Class Follow-up methods
  upsertSeguimiento: (data: Partial<SeguimientoClase> & { curso: string; fecha: string }) => void;
  upsertMultiplesSeguimientos: (items: Array<Partial<SeguimientoClase> & { curso: string; fecha: string }>) => number;
  borrarSeguimiento: (curso: string, fecha: string) => void;

  // Student management
  agregarAlumno: (curso: string, alumno: string, numero?: number, observaciones?: string, email?: string) => Alumno;
  editarAlumno: (curso: string, numero: number, datos: { alumno?: string; observaciones?: string; email?: string; activo?: boolean }) => void;
  quitarAlumno: (curso: string, numero: number, modo: 'desactivar' | 'borrar') => void;
  recargarAlumnosEmbebidos: () => void;

  // Backup & Reset
  exportarBackupJSON: () => string;
  importarBackupJSON: (jsonStr: string) => { success: boolean; message: string };
  resetearDatosIniciales: () => void;
}

const STORAGE_KEY = "REGISTRO_ESCOLAR_2026_DATA";

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

const sanitizeId = (id: string) => id.replace(/\//g, '-');

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [syncState, setSyncState] = useState("Sincronizado");

  const [cursos] = useState<Curso[]>(CURSOS_INICIALES);
  const [selectedCurso, setSelectedCurso] = useState<string>("35 TM");

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [notas, setNotas] = useState<Record<string, RegistroNota>>({});
  const [asistencias, setAsistencias] = useState<Record<string, RegistroAsistencia>>({});
  const [seguimientos, setSeguimientos] = useState<Record<string, SeguimientoClase>>(() => {
    try {
      const local = localStorage.getItem(`${STORAGE_KEY}_SEGUIMIENTOS`);
      return local ? JSON.parse(local) : SEGUIMIENTOS_INICIALES;
    } catch {
      return SEGUIMIENTOS_INICIALES;
    }
  });

  const [diasNoClase] = useState<DiaNoClase[]>(DIAS_NO_CLASE_INICIALES);
  const [bimestres] = useState<Bimestre[]>(BIMESTRES_2026);
  const [meses] = useState<MesEscolar[]>(MESES_2026);
  const [lastSaved, setLastSaved] = useState<string>("");

  const updateSaveTimestamp = () => {
    const now = new Date();
    setLastSaved(now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Auth flow
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoadingAuth(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    if (!isFirebaseConfigured || !auth) {
      alert("Firebase no está configurado. Revisa las variables de entorno en AI Studio.");
      return;
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setAlumnos([]);
    setActividades([]);
    setNotas({});
    setAsistencias({});
    setSeguimientos({});
  };

  // Sync data from Firestore
  useEffect(() => {
    if (!user || !db) return;
    setSyncState("Sincronizando...");

    const uid = user.uid;
    const unsubAlumnos = onSnapshot(collection(db, `users/${uid}/alumnos`), (snap) => {
      setAlumnos(snap.docs.map(d => d.data() as Alumno));
      setSyncState("Sincronizado");
    }, (error: any) => {
      console.error("Error sincronizando alumnos:", error);
      if (error.code === 'permission-denied') {
        alert("Atención: Firebase bloqueó el acceso. Por favor, asegúrate de haber publicado las reglas de seguridad en firestore.rules.");
      }
      setSyncState("Error de permisos/conexión");
    });

    const unsubActividades = onSnapshot(collection(db, `users/${uid}/actividades`), (snap) => {
      setActividades(snap.docs.map(d => d.data() as Actividad));
      setSyncState("Sincronizado");
    }, (error: any) => {
      console.error("Error sincronizando actividades:", error);
      setSyncState("Error de permisos/conexión");
    });

    const unsubNotas = onSnapshot(collection(db, `users/${uid}/notas`), (snap) => {
      const n: Record<string, RegistroNota> = {};
      snap.docs.forEach(d => { n[d.data().clave] = d.data() as RegistroNota; });
      setNotas(n);
      setSyncState("Sincronizado");
    }, (error) => {
      console.error("Error sincronizando notas:", error);
      setSyncState("Sin conexión (se sincronizará)");
    });

    const unsubAsistencias = onSnapshot(collection(db, `users/${uid}/asistencias`), (snap) => {
      const a: Record<string, RegistroAsistencia> = {};
      snap.docs.forEach(d => { a[d.data().clave] = d.data() as RegistroAsistencia; });
      setAsistencias(a);
      setSyncState("Sincronizado");
    }, (error) => {
      console.error("Error sincronizando asistencias:", error);
      setSyncState("Sin conexión (se sincronizará)");
    });

    const unsubSeguimientos = onSnapshot(collection(db, `users/${uid}/seguimientos`), (snap) => {
      const s: Record<string, SeguimientoClase> = {};
      snap.docs.forEach(d => { s[d.data().clave] = d.data() as SeguimientoClase; });
      setSeguimientos(s);
      setSyncState("Sincronizado");
    }, (error) => {
      console.error("Error sincronizando seguimientos:", error);
      setSyncState("Sin conexión (se sincronizará)");
    });

    return () => {
      unsubAlumnos();
      unsubActividades();
      unsubNotas();
      unsubAsistencias();
      unsubSeguimientos();
    };
  }, [user]);

  // Migration from localStorage
  useEffect(() => {
    if (!user || loadingAuth || !db) return;
    // Check if migration is needed (if firebase is empty but local storage has data)
    const checkMigration = async () => {
      const snap = await getDocs(collection(db, `users/${user.uid}/alumnos`));
      if (snap.empty) {
        const localAlumnos = localStorage.getItem(`${STORAGE_KEY}_ALUMNOS`);
        if (localAlumnos && confirm("Se encontraron datos locales. ¿Deseas migrarlos a la nube?")) {
          setSyncState("Migrando datos locales...");
          try {
            const dataAlumnos: Alumno[] = JSON.parse(localAlumnos);
            const dataActividades: Actividad[] = JSON.parse(localStorage.getItem(`${STORAGE_KEY}_ACTIVIDADES`) || "[]");
            const dataNotas: Record<string, RegistroNota> = JSON.parse(localStorage.getItem(`${STORAGE_KEY}_NOTAS`) || "{}");
            const dataAsistencias: Record<string, RegistroAsistencia> = JSON.parse(localStorage.getItem(`${STORAGE_KEY}_ASISTENCIAS`) || "{}");

            await performBatchWrite(async (batch) => {
              dataAlumnos.forEach(a => {
                const ref = doc(db, `users/${user.uid}/alumnos`, sanitizeId(`${a.curso}-${a.numero}`));
                batch.set(ref, a);
              });
              dataActividades.forEach(a => {
                const ref = doc(db, `users/${user.uid}/actividades`, sanitizeId(a.id));
                batch.set(ref, a);
              });
              Object.values(dataNotas).forEach(n => {
                const ref = doc(db, `users/${user.uid}/notas`, sanitizeId(n.clave));
                batch.set(ref, n);
              });
              Object.values(dataAsistencias).forEach(a => {
                const ref = doc(db, `users/${user.uid}/asistencias`, sanitizeId(a.clave));
                batch.set(ref, a);
              });
            });
            alert("Migración completada con éxito.");
            localStorage.removeItem(`${STORAGE_KEY}_ALUMNOS`);
            localStorage.removeItem(`${STORAGE_KEY}_ACTIVIDADES`);
            localStorage.removeItem(`${STORAGE_KEY}_NOTAS`);
            localStorage.removeItem(`${STORAGE_KEY}_ASISTENCIAS`);
          } catch (e) {
            console.error(e);
            alert("Error al migrar datos.");
          }
          setSyncState("Sincronizado");
        }
      }
    };
    checkMigration();
  }, [user, loadingAuth]);

  // Helper for batch writes
  const performBatchWrite = async (operations: (batch: ReturnType<typeof writeBatch>) => void) => {
    if (!user || !db) return;
    setSyncState("Guardando...");
    try {
      const batches: ReturnType<typeof writeBatch>[] = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;

      const proxyBatch = {
        set: (ref: any, data: any) => {
          currentBatch.set(ref, data);
          opCount++;
          if (opCount === 450) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        },
        update: (ref: any, data: any) => {
          currentBatch.update(ref, data);
          opCount++;
          if (opCount === 450) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        },
        delete: (ref: any) => {
          currentBatch.delete(ref);
          opCount++;
          if (opCount === 450) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        }
      } as any;

      operations(proxyBatch);
      if (opCount > 0) batches.push(currentBatch);

      for (const b of batches) {
        await b.commit();
      }
      updateSaveTimestamp();
      setSyncState("Sincronizado");
    } catch (e: any) {
      console.error("Error en performBatchWrite:", e);
      alert("Error al guardar datos en la nube: " + e.message);
      setSyncState("Sin conexión (se sincronizará)");
    }
  };

  const upsertNotas = useCallback((nuevas: RegistroNota[]) => {
    if (!db) return;
    performBatchWrite((batch) => {
      nuevas.forEach(n => {
        const ref = doc(db, `users/${user!.uid}/notas`, sanitizeId(n.clave));
        batch.set(ref, n);
      });
    });
  }, [user]);

  const marcarPendientesActividad = useCallback((actividadId: string, cursoNombre: string): number => {
    const act = actividades.find(a => a.id === actividadId);
    if (!act) return 0;

    const alumnosCurso = alumnos.filter(a => a.curso === cursoNombre && a.activo);
    const ahora = new Date().toISOString();
    const nuevasNotas: RegistroNota[] = [];

    alumnosCurso.forEach(a => {
      const clave = `${actividadId}|${cursoNombre}|${a.numero}`;
      const actual = notas[clave];
      if (!actual || !actual.nota || actual.nota.trim() === "") {
        nuevasNotas.push({
          clave,
          actividadId,
          curso: cursoNombre,
          numero: a.numero,
          alumno: a.alumno,
          tipo: act.tipo,
          periodo: act.periodo,
          actividad: act.nombre,
          fecha: act.fecha,
          escala: act.escala,
          nota: "Pendiente",
          notaNormalizada: 0,
          observacion: actual ? actual.observacion : "",
          actualizado: ahora,
          origen: "Marcar pendientes"
        });
      }
    });

    if (nuevasNotas.length > 0) {
      upsertNotas(nuevasNotas);
    }
    return nuevasNotas.length;
  }, [actividades, alumnos, notas, upsertNotas]);

  const crearActividad = useCallback((data: {
    cursos: string[];
    nombre: string;
    tipo: TipoActividad;
    periodo: PeriodoNotas;
    fecha?: string;
    escala?: EscalaNotas;
    observaciones?: string;
  }): Actividad[] => {
    if (!user) return [];
    const timestamp = Date.now();
    const fecha = data.fecha || new Date().toISOString().split('T')[0];
    const escalaCalculada = data.escala || (escalaPorTipoPeriodo(data.tipo, data.periodo) as EscalaNotas) || "CONCEPTUAL";

    const nuevas: Actividad[] = data.cursos.map((c, i) => {
      const id = `ACT-${timestamp}-${i + 1}`;
      return {
        id,
        curso: c,
        nombre: data.nombre,
        tipo: data.tipo,
        periodo: data.periodo,
        fecha,
        escala: escalaCalculada,
        activa: true,
        observaciones: data.observaciones || (data.cursos.length > 1 ? "Creada en carga múltiple" : ""),
        creado: fecha
      };
    });

    performBatchWrite((batch) => {
      nuevas.forEach(a => {
        batch.set(doc(db, `users/${user.uid}/actividades`, sanitizeId(a.id)), a);
      });
    });
    return nuevas;
  }, [user]);

  const editarActividad = useCallback((actividadNueva: Actividad) => {
    if (!user) return { actualizadas: 0, incompatibles: 0 };
    const anterior = actividades.find(a => a.id === actividadNueva.id);
    const escalaCambio = anterior && anterior.escala !== actividadNueva.escala;

    let actualizadas = 0;
    let incompatibles = 0;
    const ahora = new Date().toISOString();

    performBatchWrite((batch) => {
      batch.set(doc(db, `users/${user.uid}/actividades`, sanitizeId(actividadNueva.id)), actividadNueva);
      
      Object.keys(notas).forEach(k => {
        const reg = notas[k];
        if (reg.actividadId === actividadNueva.id) {
          actualizadas++;
          let notaVal = reg.nota;
          let normalizada = reg.notaNormalizada;

          if (escalaCambio) {
            notaVal = normalizarNotaPorEscala(reg.nota, actividadNueva.escala);
            normalizada = notaOrden(notaVal, actividadNueva.escala);
            if (reg.nota && !notaVal) {
              incompatibles++;
            }
          }

          const updatedReg = {
            ...reg,
            tipo: actividadNueva.tipo,
            periodo: actividadNueva.periodo,
            actividad: actividadNueva.nombre,
            fecha: actividadNueva.fecha,
            escala: actividadNueva.escala,
            nota: notaVal,
            notaNormalizada: normalizada,
            actualizado: ahora
          };
          batch.set(doc(db, `users/${user.uid}/notas`, sanitizeId(reg.clave)), updatedReg);
        }
      });
    });

    return { actualizadas, incompatibles };
  }, [user, actividades, notas]);

  const desactivarActividad = useCallback((actividadId: string) => {
    if (!user) return;
    performBatchWrite((batch) => {
      batch.update(doc(db, `users/${user.uid}/actividades`, sanitizeId(actividadId)), { activa: false });
    });
  }, [user]);

  const borrarActividadDefinitivo = useCallback((actividadId: string) => {
    if (!user) return;
    performBatchWrite((batch) => {
      batch.delete(doc(db, `users/${user.uid}/actividades`, sanitizeId(actividadId)));
      Object.keys(notas).forEach(k => {
        if (notas[k].actividadId === actividadId) {
          batch.delete(doc(db, `users/${user.uid}/notas`, sanitizeId(k)));
        }
      });
    });
  }, [user, notas]);

  const guardarNotasBimestralesCurso = useCallback((
    cursoNombre: string,
    periodo: PeriodoNotas,
    notasPorNumero: Record<number, string>
  ) => {
    if (!user) return { total: 0, invalidas: 0 };
    const esBimestral = periodo === "1° bimestre" || periodo === "3° bimestre";
    const tipoBim = esBimestral ? "Nota bimestral conceptual" : "Nota cuatrimestral numérica";
    const escalaBim: EscalaNotas = esBimestral ? "BIMESTRAL_EP_S_A" : "NUMERICA_1_10";
    const nombreAct = esBimestral
      ? (periodo === "1° bimestre" ? "Nota 1° bimestre" : "Nota 3° bimestre")
      : (periodo === "2° bimestre / 1° cuatrimestre" ? "Nota 1° cuatrimestre" : "Nota 2° cuatrimestre");

    let actBim = actividades.find(a => a.curso === cursoNombre && a.tipo === tipoBim && a.periodo === periodo);
    
    performBatchWrite((batch) => {
      if (!actBim) {
        const id = `ACT-BIM-${Date.now()}`;
        actBim = {
          id,
          curso: cursoNombre,
          nombre: nombreAct,
          tipo: tipoBim,
          periodo,
          fecha: new Date().toISOString().split('T')[0],
          escala: escalaBim,
          activa: true,
          observaciones: "Generada automáticamente para cierre de período",
          creado: new Date().toISOString()
        };
        batch.set(doc(db, `users/${user.uid}/actividades`, sanitizeId(actBim.id)), actBim);
      }

      const alumnosCurso = alumnos.filter(a => a.curso === cursoNombre && a.activo);
      const ahora = new Date().toISOString();

      Object.entries(notasPorNumero).forEach(([numStr, notaRaw]) => {
        const num = Number(numStr);
        const alumnoObj = alumnosCurso.find(a => a.numero === num);
        if (!alumnoObj || !notaRaw) return;

        const notaNorm = normalizarNotaPorEscala(notaRaw, escalaBim);
        if (!notaNorm) return;

        const reg: RegistroNota = {
          clave: `${actBim!.id}|${cursoNombre}|${num}`,
          actividadId: actBim!.id,
          curso: cursoNombre,
          numero: num,
          alumno: alumnoObj.alumno,
          tipo: actBim!.tipo,
          periodo,
          actividad: actBim!.nombre,
          fecha: actBim!.fecha,
          escala: escalaBim,
          nota: notaNorm,
          notaNormalizada: notaOrden(notaNorm, escalaBim),
          observacion: "Guardado desde sugerencias bimestrales",
          actualizado: ahora,
          origen: "Sugerencias bimestrales"
        };
        batch.set(doc(db, `users/${user.uid}/notas`, sanitizeId(reg.clave)), reg);
      });
    });

    return { total: Object.keys(notasPorNumero).length, invalidas: 0 };
  }, [user, actividades, alumnos]);

  const importarNotasForms = useCallback((
    cursoNombre: string,
    actividadId: string,
    datos: Array<{ numero?: number; nombre?: string; puntaje: number | string; obs?: string }>
  ) => {
    if (!user) return { procesados: 0, duplicados: 0, noEncontrados: 0 };
    const act = actividades.find(a => a.id === actividadId);
    if (!act) return { procesados: 0, duplicados: 0, noEncontrados: 0 };

    const alumnosCurso = alumnos.filter(a => a.curso === cursoNombre && a.activo);
    const ahora = new Date().toISOString();
    const usados: Record<string, boolean> = {};
    let duplicados = 0;
    let noEncontrados = 0;
    let procesados = 0;

    performBatchWrite((batch) => {
      datos.forEach(row => {
        let target: Alumno | undefined;
        if (row.numero) {
          target = alumnosCurso.find(a => a.numero === Number(row.numero));
        }
        if (!target && row.nombre) {
          const nomUpper = row.nombre.trim().toUpperCase();
          target = alumnosCurso.find(a => a.alumno.toUpperCase() === nomUpper || a.alumno.toUpperCase().includes(nomUpper) || nomUpper.includes(a.alumno.toUpperCase()));
        }

        if (!target) {
          noEncontrados++;
          return;
        }

        const nota = convertirPuntajeFormsAConceptual(row.puntaje);
        if (!nota) return;

        const clave = `${actividadId}|${cursoNombre}|${target.numero}`;
        if (usados[clave]) {
          duplicados++;
          return;
        }
        usados[clave] = true;

        const reg: RegistroNota = {
          clave,
          actividadId,
          curso: cursoNombre,
          numero: target.numero,
          alumno: target.alumno,
          tipo: act.tipo,
          periodo: act.periodo,
          actividad: act.nombre,
          fecha: act.fecha,
          escala: act.escala,
          nota,
          notaNormalizada: notaOrden(nota, act.escala),
          observacion: row.obs ? `${row.obs} | Forms: ${row.puntaje}` : `Forms: ${row.puntaje}`,
          actualizado: ahora,
          origen: "Google Forms"
        };
        batch.set(doc(db, `users/${user.uid}/notas`, sanitizeId(clave)), reg);
        procesados++;
      });
    });

    return { procesados, duplicados, noEncontrados };
  }, [user, actividades, alumnos]);

  const upsertAsistencias = useCallback((nuevas: RegistroAsistencia[]) => {
    if (!user) return;
    performBatchWrite((batch) => {
      nuevas.forEach(a => {
        batch.set(doc(db, `users/${user.uid}/asistencias`, sanitizeId(a.clave)), a);
      });
    });
  }, [user]);

  const marcarDiaNC = useCallback((cursoNombre: string, fechaYmd: string, bloque: string) => {
    if (!user) return;
    const alumnosCurso = alumnos.filter(a => a.curso === cursoNombre && a.activo);
    const fechaObj = parseYmd(fechaYmd);
    const dia = nombreDia(fechaObj);
    const ahora = new Date().toISOString();

    performBatchWrite((batch) => {
      alumnosCurso.forEach(a => {
        const reg: RegistroAsistencia = {
          clave: keyAsistencia(cursoNombre, a.numero, fechaYmd, bloque),
          curso: cursoNombre,
          numero: a.numero,
          alumno: a.alumno,
          fecha: fechaYmd,
          dia,
          mes: `${fechaYmd.split('-')[0]}-${fechaYmd.split('-')[1]}`,
          bimestre: "Bimestre",
          bloque,
          estado: "N/C",
          observacion: "Feriado / Sin clase",
          actualizado: ahora
        };
        batch.set(doc(db, `users/${user.uid}/asistencias`, sanitizeId(reg.clave)), reg);
      });
    });
  }, [user, alumnos]);

  const marcarDiaP = useCallback((cursoNombre: string, fechaYmd: string, bloque: string) => {
    if (!user) return;
    const alumnosCurso = alumnos.filter(a => a.curso === cursoNombre && a.activo);
    const fechaObj = parseYmd(fechaYmd);
    const dia = nombreDia(fechaObj);
    const ahora = new Date().toISOString();

    performBatchWrite((batch) => {
      alumnosCurso.forEach(a => {
        const reg: RegistroAsistencia = {
          clave: keyAsistencia(cursoNombre, a.numero, fechaYmd, bloque),
          curso: cursoNombre,
          numero: a.numero,
          alumno: a.alumno,
          fecha: fechaYmd,
          dia,
          mes: `${fechaYmd.split('-')[0]}-${fechaYmd.split('-')[1]}`,
          bimestre: "Bimestre",
          bloque,
          estado: "P",
          observacion: "",
          actualizado: ahora
        };
        batch.set(doc(db, `users/${user.uid}/asistencias`, sanitizeId(reg.clave)), reg);
      });
    });
  }, [user, alumnos]);

  const agregarAlumno = useCallback((
    cursoNombre: string,
    nombre: string,
    numeroCustom?: number,
    observaciones?: string,
    email?: string
  ): Alumno => {
    const alumnosCurso = alumnos.filter(a => a.curso === cursoNombre);
    const num = numeroCustom || (alumnosCurso.reduce((max, a) => Math.max(max, a.numero), 0) + 1);

    const nuevo: Alumno = {
      curso: cursoNombre,
      numero: num,
      alumno: nombre.trim(),
      activo: true,
      email: email ? email.trim() : "",
      observaciones: observaciones || ""
    };

    if (user && db) {
      setDoc(doc(db, `users/${user.uid}/alumnos`, sanitizeId(`${cursoNombre}-${num}`)), nuevo);
      updateSaveTimestamp();
    }
    return nuevo;
  }, [user, alumnos]);

  // Class follow-up methods
  const upsertSeguimiento = useCallback((data: Partial<SeguimientoClase> & { curso: string; fecha: string }) => {
    const clave = keySeguimiento(data.curso, data.fecha);
    const previo = seguimientos[clave] || {
      clave,
      curso: data.curso,
      fecha: data.fecha,
      planMd: "",
      observaciones: "",
      hastaDonde: "",
    };

    const actualizadoObj: SeguimientoClase = {
      ...previo,
      ...data,
      clave,
      curso: data.curso,
      fecha: data.fecha,
      planMd: data.planMd !== undefined ? data.planMd : previo.planMd,
      observaciones: data.observaciones !== undefined ? data.observaciones : previo.observaciones,
      hastaDonde: data.hastaDonde !== undefined ? data.hastaDonde : previo.hastaDonde,
      actualizado: new Date().toISOString(),
      usuario: user?.email || undefined
    };

    setSeguimientos(prev => {
      const next = { ...prev, [clave]: actualizadoObj };
      try {
        localStorage.setItem(`${STORAGE_KEY}_SEGUIMIENTOS`, JSON.stringify(next));
      } catch (err) {
        console.error("Error guardando seguimiento en localStorage:", err);
      }
      return next;
    });

    if (user && db) {
      const ref = doc(db, `users/${user.uid}/seguimientos`, sanitizeId(clave));
      setDoc(ref, actualizadoObj);
    }
    updateSaveTimestamp();
  }, [user, seguimientos]);

  const upsertMultiplesSeguimientos = useCallback((items: Array<Partial<SeguimientoClase> & { curso: string; fecha: string }>) => {
    if (!items || items.length === 0) return 0;
    const ahora = new Date().toISOString();
    const userEmail = user?.email || undefined;

    setSeguimientos(prev => {
      const next = { ...prev };
      items.forEach(data => {
        const clave = keySeguimiento(data.curso, data.fecha);
        const previo = next[clave] || {
          clave,
          curso: data.curso,
          fecha: data.fecha,
          planMd: "",
          observaciones: "",
          hastaDonde: "",
        };

        const actualizadoObj: SeguimientoClase = {
          ...previo,
          ...data,
          clave,
          curso: data.curso,
          fecha: data.fecha,
          planMd: data.planMd !== undefined ? data.planMd : previo.planMd,
          observaciones: (data.observaciones !== undefined && data.observaciones !== "") ? data.observaciones : previo.observaciones,
          hastaDonde: (data.hastaDonde !== undefined && data.hastaDonde !== "") ? data.hastaDonde : previo.hastaDonde,
          actualizado: ahora,
          usuario: userEmail
        };

        next[clave] = actualizadoObj;

        if (user && db) {
          const ref = doc(db, `users/${user.uid}/seguimientos`, sanitizeId(clave));
          setDoc(ref, actualizadoObj);
        }
      });

      try {
        localStorage.setItem(`${STORAGE_KEY}_SEGUIMIENTOS`, JSON.stringify(next));
      } catch (err) {
        console.error("Error guardando seguimientos en localStorage:", err);
      }

      return next;
    });

    updateSaveTimestamp();
    return items.length;
  }, [user]);

  const borrarSeguimiento = useCallback((curso: string, fecha: string) => {
    const clave = keySeguimiento(curso, fecha);
    setSeguimientos(prev => {
      const copy = { ...prev };
      delete copy[clave];
      try {
        localStorage.setItem(`${STORAGE_KEY}_SEGUIMIENTOS`, JSON.stringify(copy));
      } catch (err) {
        console.error("Error actualizando seguimientos en localStorage:", err);
      }
      return copy;
    });
    if (user && db) {
      const ref = doc(db, `users/${user.uid}/seguimientos`, sanitizeId(clave));
      deleteDoc(ref);
    }
    updateSaveTimestamp();
  }, [user]);

  const editarAlumno = useCallback((
    cursoNombre: string,
    numero: number,
    datos: { alumno?: string; observaciones?: string; email?: string; activo?: boolean }
  ) => {
    if (!user || !db) return;
    const id = sanitizeId(`${cursoNombre}-${numero}`);
    const updatePayload: Partial<Alumno> = {};
    if (datos.alumno !== undefined) updatePayload.alumno = datos.alumno.trim();
    if (datos.observaciones !== undefined) updatePayload.observaciones = datos.observaciones.trim();
    if (datos.email !== undefined) updatePayload.email = datos.email.trim();
    if (datos.activo !== undefined) updatePayload.activo = datos.activo;

    updateDoc(doc(db, `users/${user.uid}/alumnos`, id), updatePayload);
    updateSaveTimestamp();
  }, [user]);

  const quitarAlumno = useCallback((cursoNombre: string, numero: number, modo: 'desactivar' | 'borrar') => {
    if (!user || !db) return;
    const id = sanitizeId(`${cursoNombre}-${numero}`);
    if (modo === 'desactivar') {
      updateDoc(doc(db, `users/${user.uid}/alumnos`, id), { activo: false });
    } else {
      deleteDoc(doc(db, `users/${user.uid}/alumnos`, id));
    }
    updateSaveTimestamp();
  }, [user]);

  const recargarAlumnosEmbebidos = useCallback(() => {
    if (!user) return;
    performBatchWrite((batch) => {
      ALUMNOS_INICIALES.forEach(a => {
        batch.set(doc(db, `users/${user.uid}/alumnos`, sanitizeId(`${a.curso}-${a.numero}`)), a);
      });
    });
  }, [user]);

  // Backup and restore
  const exportarBackupJSON = useCallback((): string => {
    const backup = {
      version: "2026.1",
      exportDate: new Date().toISOString(),
      alumnos,
      actividades,
      notas,
      asistencias,
      seguimientos
    };
    return JSON.stringify(backup, null, 2);
  }, [alumnos, actividades, notas, asistencias, seguimientos]);

  const importarBackupJSON = useCallback((jsonStr: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || (!data.alumnos && !data.actividades && !data.notas)) {
        return { success: false, message: "El archivo no contiene un formato de respaldo válido." };
      }

      if (user) {
        setSyncState("Importando backup...");
        performBatchWrite(async (batch) => {
          if (Array.isArray(data.alumnos)) {
            data.alumnos.forEach((a: Alumno) => {
              const alumnoObj: Alumno = {
                curso: a.curso,
                numero: Number(a.numero),
                alumno: a.alumno,
                activo: a.activo !== false,
                email: a.email ? String(a.email).trim() : "",
                observaciones: a.observaciones || ""
              };
              batch.set(doc(db, `users/${user.uid}/alumnos`, sanitizeId(`${a.curso}-${a.numero}`)), alumnoObj);
            });
          }
          if (Array.isArray(data.actividades)) {
            data.actividades.forEach((a: Actividad) => batch.set(doc(db, `users/${user.uid}/actividades`, sanitizeId(a.id)), a));
          }
          if (data.notas) {
            const notasArray = Array.isArray(data.notas) ? data.notas : Object.values(data.notas);
            notasArray.forEach((n: any) => batch.set(doc(db, `users/${user.uid}/notas`, sanitizeId(n.clave)), n));
          }
          if (data.asistencias) {
            const asisArray = Array.isArray(data.asistencias) ? data.asistencias : Object.values(data.asistencias);
            asisArray.forEach((a: any) => batch.set(doc(db, `users/${user.uid}/asistencias`, sanitizeId(a.clave)), a));
          }
          if (data.seguimientos) {
            const segArray = Array.isArray(data.seguimientos) ? data.seguimientos : Object.values(data.seguimientos);
            segArray.forEach((s: any) => batch.set(doc(db, `users/${user.uid}/seguimientos`, sanitizeId(s.clave || `${s.curso}|${s.fecha}`)), s));
          }
        });
      }

      return { success: true, message: "Respaldo restaurado con éxito hacia la nube." };
    } catch (err) {
      return { success: false, message: `Error al leer el archivo JSON: ${(err as Error).message}` };
    }
  }, [user]);

  const resetearDatosIniciales = useCallback(() => {
    if (!user) return;
    performBatchWrite((batch) => {
      ALUMNOS_INICIALES.forEach(a => batch.set(doc(db, `users/${user.uid}/alumnos`, sanitizeId(`${a.curso}-${a.numero}`)), a));
      ACTIVIDADES_INICIALES.forEach(a => batch.set(doc(db, `users/${user.uid}/actividades`, sanitizeId(a.id)), a));
      REGISTROS_NOTAS_INICIALES.forEach(n => batch.set(doc(db, `users/${user.uid}/notas`, sanitizeId(n.clave)), n));
      // Asistencias is empty initially
    });
  }, [user]);

  return (
    <SchoolContext.Provider
      value={{
        user,
        loadingAuth,
        login,
        logout,
        syncState,
        cursos,
        selectedCurso,
        setSelectedCurso,
        alumnos,
        actividades,
        notas,
        asistencias,
        seguimientos,
        diasNoClase,
        bimestres,
        meses,
        lastSaved,
        upsertNotas,
        marcarPendientesActividad,
        crearActividad,
        editarActividad,
        desactivarActividad,
        borrarActividadDefinitivo,
        guardarNotasBimestralesCurso,
        importarNotasForms,
        upsertAsistencias,
        marcarDiaNC,
        marcarDiaP,
        upsertSeguimiento,
        upsertMultiplesSeguimientos,
        borrarSeguimiento,
        agregarAlumno,
        editarAlumno,
        quitarAlumno,
        recargarAlumnosEmbebidos,
        exportarBackupJSON,
        importarBackupJSON,
        resetearDatosIniciales
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = (): SchoolContextType => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return context;
};
