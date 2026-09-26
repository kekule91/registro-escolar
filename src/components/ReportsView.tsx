import React, { useState, useMemo } from 'react';
import { useSchool } from '../context/SchoolContext';
import { PeriodoNotas, EscalaNotas, EstadoPresentismo } from '../types';
import {
  sugerirNotaBimestral,
  obtenerBadgeEstiloNota,
  listaPorEscala,
  ItemEvaluacionDetalle,
  fmtFechaNotas
} from '../utils/gradeEngine';
import {
  generarSesionesCursoRango,
  keyAsistencia,
  fmtFecha,
  INFO_ESTADOS_PRESENTISMO
} from '../utils/attendanceEngine';
import {
  Sparkles,
  UserCheck,
  Calendar,
  ClockAlert,
  Save,
  CheckCircle,
  FileText,
  AlertTriangle,
  Award,
  Check,
  CalendarCheck
} from 'lucide-react';
import { PendingReportsSection } from './reports/PendingReportsSection';
import { AttendanceReportsSection } from './reports/AttendanceReportsSection';

type ReportSubTab = 'pendientes' | 'ausentismo' | 'sugerencias' | 'alumno-notas' | 'alumno-asistencia' | 'sin-cargar';

export const ReportsView: React.FC = () => {
  const {
    selectedCurso,
    cursos,
    alumnos,
    actividades,
    notas,
    asistencias,
    bimestres,
    diasNoClase,
    guardarNotasBimestralesCurso,
    upsertNotas
  } = useSchool();

  const [activeReportTab, setActiveReportTab] = useState<ReportSubTab>('pendientes');

  const currentCursoObj = useMemo(() => {
    return cursos.find(c => c.curso === selectedCurso) || cursos[0];
  }, [cursos, selectedCurso]);

  const courseStudents = useMemo(() => {
    return alumnos
      .filter(a => a.curso === selectedCurso && a.activo)
      .sort((a, b) => a.numero - b.numero);
  }, [alumnos, selectedCurso]);

  // Period filter for suggestions and reports
  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoNotas>("1° bimestre");

  // Selected student for individual reports
  const [selectedStudentNum, setSelectedStudentNum] = useState<number>(() => {
    return courseStudents.length > 0 ? courseStudents[0].numero : 1;
  });

  const selectedStudentObj = useMemo(() => {
    return courseStudents.find(s => s.numero === selectedStudentNum) || courseStudents[0];
  }, [courseStudents, selectedStudentNum]);

  // Selected Bimestre for attendance report
  const [selectedBimestreName, setSelectedBimestreName] = useState<string>("1° bimestre");

  // Local state for editable grades in Sugerencias Bimestrales table
  const [editableGrades, setEditableGrades] = useState<Record<number, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 1. SUGERENCIAS BIMESTRALES POR CURSO
  const esBimestral = selectedPeriodo === "1° bimestre" || selectedPeriodo === "3° bimestre";
  const escalaBim: EscalaNotas = esBimestral ? "BIMESTRAL_EP_S_A" : "NUMERICA_1_10";
  const allowedBimGrades = useMemo(() => listaPorEscala(escalaBim), [escalaBim]);

  // Activities in this period (excluding the bimestral final grade activity itself)
  const periodActivities = useMemo(() => {
    return actividades.filter(a =>
      a.curso === selectedCurso &&
      a.activa &&
      a.periodo === selectedPeriodo &&
      a.tipo !== "Nota bimestral conceptual" &&
      a.tipo !== "Nota cuatrimestral numérica"
    );
  }, [actividades, selectedCurso, selectedPeriodo]);

  // Find the official bimestral activity if it already exists
  const existingBimAct = useMemo(() => {
    return actividades.find(a =>
      a.curso === selectedCurso &&
      a.periodo === selectedPeriodo &&
      (a.tipo === "Nota bimestral conceptual" || a.tipo === "Nota cuatrimestral numérica")
    );
  }, [actividades, selectedCurso, selectedPeriodo]);

  // Compute suggestions for every student in course
  const courseSuggestions = useMemo(() => {
    return courseStudents.map(student => {
      const detalleEvaluaciones: ItemEvaluacionDetalle[] = periodActivities.map(act => {
        const reg = notas[`${act.id}|${selectedCurso}|${student.numero}`];
        return {
          tipo: act.tipo,
          nombre: act.nombre,
          escala: act.escala,
          nota: reg?.nota || "",
          observacion: reg?.observacion || "",
          fecha: act.fecha
        };
      });

      const res = sugerirNotaBimestral(detalleEvaluaciones, esBimestral);

      // Check if already saved in base
      let savedGrade = "";
      if (existingBimAct) {
        const regSaved = notas[`${existingBimAct.id}|${selectedCurso}|${student.numero}`];
        savedGrade = regSaved?.nota || "";
      }

      return {
        student,
        sugerida: res.nota,
        razon: res.razon,
        savedGrade,
        currentValue: editableGrades[student.numero] !== undefined
          ? editableGrades[student.numero]
          : (savedGrade || res.nota || "")
      };
    });
  }, [courseStudents, periodActivities, notas, selectedCurso, esBimestral, existingBimAct, editableGrades]);

  const handleSaveAllBimestral = () => {
    const gradesToSave: Record<number, string> = {};
    courseSuggestions.forEach(item => {
      if (item.currentValue) {
        gradesToSave[item.student.numero] = item.currentValue;
      }
    });

    const res = guardarNotasBimestralesCurso(selectedCurso, selectedPeriodo, gradesToSave);
    setSaveSuccessMsg(`✓ ${res.total} notas guardadas para ${selectedCurso} en ${selectedPeriodo}.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // 2. INDIVIDUAL STUDENT REPORT (NOTAS)
  const studentEvalDetail = useMemo(() => {
    if (!selectedStudentObj) return [];
    return periodActivities.map(act => {
      const reg = notas[`${act.id}|${selectedCurso}|${selectedStudentObj.numero}`];
      return {
        id: act.id,
        fecha: act.fecha,
        periodo: act.periodo,
        tipo: act.tipo,
        nombre: act.nombre,
        escala: act.escala,
        nota: reg?.nota || "",
        observacion: reg?.observacion || ""
      };
    });
  }, [selectedStudentObj, periodActivities, notas, selectedCurso]);

  const studentReportStats = useMemo(() => {
    const cargadas = studentEvalDetail.filter(e => e.nota && e.nota.trim() !== "").length;
    const pendientes = studentEvalDetail.length - cargadas;

    const numericExams = studentEvalDetail
      .filter(e => (e.tipo === "Prueba escrita" || e.tipo === "Prueba oral") && !isNaN(Number(e.nota)) && Number(e.nota) >= 1)
      .map(e => Number(e.nota));

    const promPruebas = numericExams.length > 0
      ? (numericExams.reduce((a, b) => a + b, 0) / numericExams.length).toFixed(2)
      : "—";

    const conceptualCounts: Record<string, number> = {
      "Insuficiente": 0,
      "En proceso": 0,
      "Aprobado": 0,
      "Notable": 0,
      "Excelente": 0
    };

    studentEvalDetail.forEach(e => {
      if (conceptualCounts[e.nota] !== undefined) {
        conceptualCounts[e.nota]++;
      }
    });

    const suggestion = sugerirNotaBimestral(
      studentEvalDetail.map(e => ({
        tipo: e.tipo,
        nombre: e.nombre,
        escala: e.escala,
        nota: e.nota,
        observacion: e.observacion
      })),
      esBimestral
    );

    return { cargadas, pendientes, promPruebas, conceptualCounts, suggestion };
  }, [studentEvalDetail, esBimestral]);

  // 3. INDIVIDUAL ATTENDANCE REPORT
  const bimestreObj = useMemo(() => {
    return bimestres.find(b => b.nombre === selectedBimestreName) || bimestres[0];
  }, [bimestres, selectedBimestreName]);

  const studentAttendanceStats = useMemo(() => {
    if (!currentCursoObj || !bimestreObj || !selectedStudentObj) {
      return { sesiones: [], previstas: 0, noCorresponde: 0, corresponden: 0, cargadas: 0, sinCargar: 0, p: 0, a: 0, t: 0, r: 0, j: 0, pctCargadas: "—", pctCorresponden: "—" };
    }

    const sesList = generarSesionesCursoRango(
      currentCursoObj,
      bimestreObj.inicio,
      bimestreObj.fin,
      diasNoClase
    );

    let p = 0;
    let a = 0;
    let t = 0;
    let r = 0;
    let j = 0;
    let noCorresponde = 0;
    let cargadas = 0;

    const sesionesDetalle = sesList.map(s => {
      const key = keyAsistencia(selectedCurso, selectedStudentObj.numero, s.ymd, s.bloque);
      const estado = asistencias[key]?.estado || "";

      if (estado === "N/C") {
        noCorresponde++;
      } else {
        if (estado) cargadas++;
        if (estado === "P") p++;
        else if (estado === "A") a++;
        else if (estado === "T") t++;
        else if (estado === "R") r++;
        else if (estado === "J") j++;
      }

      return {
        sesion: s,
        estado: estado as EstadoPresentismo
      };
    });

    const previstas = sesList.length;
    const corresponden = Math.max(0, previstas - noCorresponde);
    const sinCargar = Math.max(0, corresponden - cargadas);
    const presentesComputables = p + t + r;
    const pctCargadas = cargadas > 0 ? ((presentesComputables / cargadas) * 100).toFixed(1) + "%" : "—";
    const pctCorresponden = corresponden > 0 ? ((presentesComputables / corresponden) * 100).toFixed(1) + "%" : "—";

    return {
      sesiones: sesionesDetalle,
      previstas,
      noCorresponde,
      corresponden,
      cargadas,
      sinCargar,
      p,
      a,
      t,
      r,
      j,
      pctCargadas,
      pctCorresponden
    };
  }, [currentCursoObj, bimestreObj, selectedStudentObj, diasNoClase, selectedCurso, asistencias]);

  // 4. PENDING WORKS REPORT
  const [pendingFilterState, setPendingFilterState] = useState<string>("Todos los pendientes");

  const pendingList = useMemo(() => {
    const list: Array<{ student: typeof courseStudents[0]; pendientes: string[] }> = [];

    courseStudents.forEach(st => {
      const pendingItems: string[] = [];

      periodActivities.forEach(act => {
        const reg = notas[`${act.id}|${selectedCurso}|${st.numero}`];
        const nota = reg?.nota || "";

        let estadoDetectado = "";
        if (!nota) estadoDetectado = "Sin cargar";
        else if (nota === "Pendiente") estadoDetectado = "Pendiente";
        else if (nota === "No entregado") estadoDetectado = "No entregado";
        else if (nota === "Ausente") estadoDetectado = "Ausente";

        if (estadoDetectado) {
          if (pendingFilterState === "Todos los pendientes" ||
              (pendingFilterState === "Solo sin cargar" && estadoDetectado === "Sin cargar") ||
              (pendingFilterState === "Solo Pendiente" && estadoDetectado === "Pendiente") ||
              (pendingFilterState === "Solo No entregado" && estadoDetectado === "No entregado") ||
              (pendingFilterState === "Solo Ausente" && estadoDetectado === "Ausente")) {
            pendingItems.push(`${act.nombre} (${estadoDetectado})`);
          }
        }
      });

      if (pendingItems.length > 0) {
        list.push({ student: st, pendientes: pendingItems });
      }
    });

    return list;
  }, [courseStudents, periodActivities, notas, selectedCurso, pendingFilterState]);

  // 5. UNLOADED GRADES REPORT
  const unloadedGrouped = useMemo(() => {
    const result: Array<{
      actividad: typeof periodActivities[0];
      sinCargarAlumnos: typeof courseStudents;
    }> = [];

    periodActivities.forEach(act => {
      const missing = courseStudents.filter(st => {
        const reg = notas[`${act.id}|${selectedCurso}|${st.numero}`];
        return !reg || !reg.nota || reg.nota.trim() === "";
      });

      if (missing.length > 0) {
        result.push({ actividad: act, sinCargarAlumnos: missing });
      }
    });

    return result;
  }, [periodActivities, courseStudents, notas, selectedCurso]);

  return (
    <div className="space-y-6">
      {/* Subnav Tabs */}
      <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveReportTab('pendientes')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
            activeReportTab === 'pendientes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClockAlert className="w-4 h-4" />
          <span>Trabajos Pendientes</span>
        </button>

        <button
          onClick={() => setActiveReportTab('ausentismo')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
            activeReportTab === 'ausentismo'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Ausentismo</span>
        </button>

        <button
          onClick={() => setActiveReportTab('sugerencias')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
            activeReportTab === 'sugerencias'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Sugerencias Bimestrales (70/30)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('alumno-notas')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
            activeReportTab === 'alumno-notas'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Informe Individual (Notas)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('alumno-asistencia')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
            activeReportTab === 'alumno-asistencia'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Informe Individual (Asistencia)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('sin-cargar')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
            activeReportTab === 'sin-cargar'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Notas Sin Cargar</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. SUGERENCIAS BIMESTRALES VIEW */}
      {activeReportTab === 'sugerencias' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-betwflex-col md:flex-ro <butiv className="="space-y-4">
          <d1v className="="="sh2e-y-4">
    over:bmx itemflex over:bg-sla9x fr space-x-2">
          <CheckCircle claclassName="w-4 h-4" />
          < over:a"Insr-e<span>{saveSucceeSuccessMsg}Cálculo yestrales ta de </span30)</span>
 / Cérica")
     </button>

        )}

 h2on>

        )}

pe-y-4">
    over: mdover:bg-sla-e<sn>{saveSucceeSucceP, [cración o activ: los ong>70% exámenes/pExams.l+ 30% tes</spanprá== cpanyd(a =>
     </bs ong>ts, s ===y-4 dur-4 automá= cas.n>

        )}

 p className="="sveSuccessMsg me="="space-y-4">
    r space-x-2">
          <C3v className="="="slabel htmlFor=", cour-

  re"e-y-4">
    over: mdunded-lg flex over:bg-slate-1up, ccasesn>{saveSucceeSuccePerí,
  n>

        )}

 label className="="="s

  re>{saveSucceeSucceid=", cour-

  re">{saveSucceeSucceimestex.`);
    setTime>{saveSucceeSucceetAh"w-tex(eessMsg(nu`);
    setTimeba    et.imesttism° bimestre")e>{saveSucceeSucceite p-4 sm:p-5bg-sla-elate-200 shadow-xs fl3800 px-4bg-sla9x fover: mditems-centeed-xunded-lg flex">{saveSucceeSucn>{saveSucceeSuccesopudentimeste| selectedPeri> selectedPer (C suggesti EP / S / A </opudenn>{saveSucceeSuccesopudentimeste|2selectedPer /  selmérica")
 ri>2selectedPer /  selmérica")
 r  &&   }, [ 1}`} </opudenn>{saveSucceeSuccesopudentimeste| const escala>3selectedPer (C suggesti EP / S / A </opudenn>{saveSucceeSuccesopudentimeste|4selectedPer / 2selmérica")
 ri>4selectedPer / 2selmérica")
 r  &&   }, [ 1}`} </opudenn>{saveSucceeSuc</b`);
 ccessMsg me="="    onClick={() => s) => setActiveRestral = () => {
    ce>{saveSucceeSucceite p-4 sm:inline-r space-x-1.5 transition-colord-xl texemibold roundedflex over: roundrder borderte-100'
     r border7e-1items-centelex-col mds ${
            ">{saveSucceeSucn>{saveSucceeSucces = (h-4" />
          <span>Notas Sin eSuccessMsg}Gtrales </spandel rn (
</button>

        )}

 div>

      {s   )}

      {/* 1.="="sveSuccessMsg me="AS BRun>
 Rlg  [cr Banncr eReportTabme="bg-white p-4 sm:p-5ite s50/7elate-200 shadowite s2e-1items-ce-slordeover: mdover:ite s9x fr space-x-2s   t       <CheckCircle clacl<  Calh-4" />
          < over:ite shadoshrink-0 mt-0.5span>Notas Sin eSbg-white p-4 sm:over:[11px] lea);

-relaxedv className="="="sbs ong>R==y-4 d(h-álculo apctiCorre</bs ong>
tas Sin eSuccessMsghite p-4 sm:mxd1v •</butto"sbs ong>No rts
 ó pExams.e</bs ong> si hay pExams.riodel perí,
 nydno rts
 ó n;

una →a || "1 / EP.
tas Sin eSuccessMsghite p-4 sm:mxd1v •</butto"sbs ong>om '../typescrí= cpe</bs ong> ===i     "5 o má4 aus       →a || "5 / EP.
tas Sin eSuccessMsghite p-4 sm:mxd1v •</butto"sbs ong>Aa =>
         udCorre</bs ong>    udC 2 o má4 aa =>
      →alaa || "se topa automá= cam    riod5 / EP.
tas Sin eSuc
      {/* 1.="="sveSuccessMsg me="AS BTugereeReportTabme="bg-white p-4 sm:p-5 roundr border-slate-200 shadow-xs flex flex-col md0'
 flcolhiddenv className="="space-y-4">
    0'
 flcolx-autov className="="="sSugereite p-4 sm:m   w-full ncia)  < ncia)  -xs flex fover: meckCircle claclassNathea)eite p-4 sm:p-5bg-sla-el px-4bg-sla7e-1unded-lg flex over:lefteckCircle claclassNsNatrckCircle claclassNsNsNatheite p-4 sm:text--xs  w-1emibold.5 tra">N°</thckCircle claclassNsNsNatheite p-4 sm:text--xs4 m   w-[180px]"> });
 </thckCircle claclassNsNsNatheite p-4 sm:text--xs  w-28mibold.5 tra">Sa,
    </thckCircle claclassNsNsNatheite p-4 sm:text--xs  w-36mibold.5 tra">N|| "a        ✏</thckCircle claclassNsNsNatheite p-4 sm:text--xs4 m   w-[320px]">Croun bi d(h(
        </thckCircle claclassNsN</trckCircle claclassN</thea)ckCircle claclassNatbodyeite p-4 sm:ncia)  < ncia)  -xs fl1e-1p-5 rouneckCircle claclassNsN{s.forEach(item =>  conif (item.currentaveSucceeSuccei = use  liSa,
     =iloNota,
  listaPorEscaue) {
ta,
           }
    ucceeSuccei = use  li      =iloNota,
  listaPorEscaue) {
        grade;
     }
    ucceeSuccev className="Circle claclassNsNatrelec={ero] = item.current}eite p-4 sm:00'
          }50/80">ame="Circle claclassNsNsNatdeite p-4 sm:tex2lord-x3mibold.5 trax itemsono over:bg-sla-e<xunded-lg flex">ame="Circle claclassNsNsNsN{ero] = item.current}ame="Circle claclassNsNsNa/td>ame="Circle claclassNsNsNatdeite p-4 sm:tex2lord-x4dunded-lg flex over:bg-sla900">ame="Circle claclassNsNsNsN{ero] = item.ca'
   }ame="Circle claclassNsNsNa/td>ame="Circle claclassNsNsNatdeite p-4 sm:tex2lord-x3mibold.5 tra">ame="Circle claclassNsNsNsN{ero] =a,
     ?sName="Circle claclassNsNeSuccessMsghite p-4 sm{`inline-bame=rd-x2font-s1dr bordermdlate-200undedflex over:x acte  liSa,
    .bg}acte  liSa,
    .over}acte  liSa,
    .ate-20}`}>ame="Circle claclassNsNeSuccesN{ero] =a,
    }ame="Circle claclassNsNeSucces/button>

        )}












)| reame="Circle claclassNsNeSuccessMsghite p-4 sm"over:bg-sla4e<xitacti">Sin datoss/button>

        )}












)}ame="Circle claclassNsNsNa/td>ame="Circle claclassNsNsNatdeite p-4 sm:tex2lord-x3mibold.5 tra">ame="Circle claclassNsNsNsNs

  re>{saveSucceeSucceeSucceeSucceid={`select     -${ero] = item.current}`}ame="Circle claclassNsNeSuccen4 sm{`select     -${ero] = item.current}`}ame="Circle claclassNsNeSucceimestexe) {
        grad}ame="Circle claclassNsNeSucceetAh"w-tex(eessMs{ame="Circle claclassNsNeSuccesNi = usv consba    et.imest;ame="Circle claclassNsNeSuccesNs] = useState<Recablevipo: e.tipo,
                          ...blev,.tipo,
                          mero] = item.currentV:sv c.tipo,
                        }));ame="Circle claclassNsNeSucce}}ame="Circle claclassNsNeSucceite p-4 sm{`w-28mibold roundedflex items-centeate-200t-s1lord-xemibold.5 trads ${
      all $e.tipo,
                        e) {
        grad.tipo,
                          ? `cte  li     .bg}acte  li     .over}acte  li     .bte-20}`.tipo,
                          :xt-wh roundrshadow-xs fl3800 px-4bg-sla4}
        >
   claclassNsNeSucce}`}ame="Circle claclassNsNeSuc>ame="Circle claclassNsNeSuccesopudentimeste|">--n>
   || "--</opudenn>{saveSucceeSuccesNsNeSuccesN{ = useMemo(() =>  congipo: .tipo,
                        sopudentlec={g}aimestexg}hite p-4 sm:p-5 roundover:bg-sla900">ame="Circle claclassNsNsNsNuccesN{g}.tipo,
                        s/opudenn>{saveSucceeSuccesNsNeSuccesN))}.tipo,
                    </b`);
 ccme="Circle claclassNsNsNa/td>ame="Circle claclassNsNsNatdeite p-4 sm:tex2lord-x4dover:bg-slate-1lea);

-relaxed over:[11px]">ame="Circle claclassNsNsNsN{ero] avedG let >
  aa =>
      eimestds.riodel perí,
 ."}ame="Circle claclassNsNsNa/td>ame="Circle claclassNsN</trckCircle claclassNividades,                })}kCircle claclassN</tbodyon>

        )}

 seSta      {s   )}

      {/* 1.="="sveSucc     )}

      {/* 1. SUGERENCIAS BUDENT REPORT (NOTAS)
  const studentveReportTab === 'sugerencias' && 'alumno-asistev className="space-y-4">
          <d5">ame="CircleAS B { ProlseeReportTabme="bg-white p-4 sm:p-5 rounded-xr border-slate-200 shadow-xs flex flex-wrap gap-1">
        ce-x-1.5 tran<butiv className="="spac className="="="slabel htmlFor="= item.-select 

  re"e-y-4">
    over: mdunded-lg flex over:bg-sla5e-1up, ccase bame=rmbd1v className="="="
  Alumn n>

        )}

 label className="="="s

  re>{saveSucceeSucceid="= item.-select 

  re">{saveSucceeSucceimestex.`);
    // Selecte>{saveSucceeSucceetAh"w-tex(eessMsg(nu`);
    // Select && Number    et.imest))e>{saveSucceeSucceite p-4 sm:p-5bg-sla-elate-200 shadow-xs fl3800 px-4bg-sla9x fover: mditems-centeed-xundedflex m   w-[220px]">{saveSucceeSucn>{saveSucceeSucce{ap(student => {
    ipo: .tipo,
            sopudentlec={scurrent}eimestex.current}ckCircle claclassNividN° {scurrent}e- {sca'
   }ame="Circle claclass/opudenn>{saveSucceeSucce))e>{saveSucceeSuc</b`);
 ccme="Circle csveSuccessMsg me="="spac className="="="slabel htmlFor=", cour-select 

  re"e-y-4">
    over: mdunded-lg flex over:bg-sla5e-1up, ccase bame=rmbd1v className="="="
 Perí,
  n>

        )}

 label className="="="s

  re>{saveSucceeSucceid=", cour-select 

  re">{saveSucceeSucceimestex.`);
    setTime>{saveSucceeSucceetAh"w-tex(eessMsg(nu`);
    setTimeba    et.imesttism° bimestre")e>{saveSucceeSucceite p-4 sm:p-5bg-sla-elate-200 shadow-xs fl3800 px-4bg-sla9x fover: mditems-centeed-xundeds-cent">{saveSucceeSucn>{saveSucceeSuccesopudentimeste| selectedPeri> selectedPer</opudenn>{saveSucceeSuccesopudentimeste|2selectedPer /  selmérica")
 ri>2selectedPer /  selmérica")
 r</opudenn>{saveSucceeSuccesopudentimeste| const escala>3selectedPer</opudenn>{saveSucceeSuccesopudentimeste|4selectedPer / 2selmérica")
 ri>4selectedPer / 2selmérica")
 r</opudenn>{saveSucceeSuc</b`);
 cctas Sin eSuc
      {/* 1.="="sveSuccessMsg me="AS Bdent => Overview    dseeReportTabme="Obj.numero}`];
    ev className="me="bg-white p-4 sm:g    g       sd-xl bg       sd4 lgbg       sd6n<but3v className="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSuccessMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesnAa =>
     :s/button>

        )}



pe-y-4">
    over:nteritemflex over:bg-sla9x fmtd1v {l.length - cargadas;

  }
 p className="="uc
      {/* 1.="="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSuccessMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesn pctCorres/button>

        )}



pe-y-4">
    over:nteritemflex over:r borderte-1mtd1v {l.lengteMemo(() =>.sinCarga}
 p className="="uc
      {/* 1.="="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSuccessMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesn>
        es/button>

        )}



pe-y-4">
   {`over:nteritemflex mtd1 ${l.lengteMemo(() =>.dentEvalDetsCompu'over:a"Insrte-'00 hover:bg-sla5e-'}`}>ame="Circle claclas{l.lengteMemo(() =>.dentEvalDe}kCircle claclassN</p className="="uc
      {/* 1.="="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSuccessMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesn>ros-ceo PExams.e</button>

        )}



pe-y-4">
    over:nteritemflex over:ite shadomtd1v {l.lengteMemo(() =>.ceptualCoun}
 p className="="uc
      {/* 1.="="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap xl b   -buttCheckCircle claclassNasMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesnN|| "Sa,
    e</button>

        )}



pace-y-4">
    r space-x-2">
          <C2omtd1v ame="Circle claclas{l.lengteMemo(() =>.}, [studena.trim?sName="Circle claclassNssMsghite p-4 sm{`d-x2font-s0fonr bordermdlate-200undedflex over:sm ${loNota,
  listaPorEscaul.lengteMemo(() =>.}, [studena.tri).bg}actloNota,
  listaPorEscaul.lengteMemo(() =>.}, [studena.tri).over}`}>ame="Circle claclassNsN{l.lengteMemo(() =>.}, [studena.tri}ame="Circle claclassNs/button>

        )}




)| reame="Circle claclassNasMsghite p-4 sm:over: mdover:bg-sla4e<xitacti">Sin datoss/button>

        )}




)}kCircle claclassN</     {/* 1.="="="="s/     {/* 1.="="="s/     {/* 1.="=" SUGERENCIabs */}
   [studentCroun bin Banncr eReportTabme="{l.lengteMemo(() =>.}, [studenaavedG v className="me="bg-white p-4 sm:p-5bg-sla-elate-200 shadow-xs flex fed fonr border-slover: mdover:bg-sla700">ame="Circle clasbs onghite p-4 sm"over:bg-sla9x fbame=rmbd1v Croun bi p, [cradoe</bs ong>
tas Sin eSuccesphite p-4 sm"over:bg-slate-1lea);

-relaxedv {l.lengteMemo(() =>.}, [studenaavedG}
 p className="="sveSucc{/* 1.="=" SUGERENCIabs */}
Bimest() => (() => TugereeReportTabme="bg-white p-4 sm:p-5 roundr border-slate-200 shadow-xs flex flex-col md0'
 flcolhiddenv className="="space-y-4">
    ordep-5bg-sla-elate-20-b0 shadow-xs flex fundedflex over:x a px-4bg-sla7e-1up, ccase track;

-widra">ame="Circle clat.map(s de Bimestral);
riodx.`);
    setTime>{saveSucceeSs/     {/* 1.="="="space-y-4">
    0'
 flcolx-autov className="="="sSugereite p-4 sm:m   w-full ncia)  < ncia)  -xs flex fover: meckCircle claclassNathea)eite p-4 sm:p-5 roundover:bg-sla6e-1unded-lg flex over:lefteckCircle claclassNsNatrckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3">TADOS</thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3">Tipo</thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x4snAa =>
   </thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3">), [es</thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3 w-28snN|| </thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x4snO })),
  ón</thckCircle claclassNsN</trckCircle claclassN</thea)ckCircle claclassNatbodyeite p-4 sm:ncia)  < ncia)  -xs fl1e-1p-5 rouneckCircle claclassNsN{l.length - cargadas;

   ' &&0m?sName="Circle claclassNstrckCircle claclassNsNsNsNatdeiolSutt={6}eite p-4 sm:tex6mibold.5 tradsver:bg-sla4e<">ame="Circle claclassNsNsNNo hay aa =>
      ===i    ds.riodesundeerí,
 .
="Circle claclassNsNsNa/td>ame="Circle claclassN</trckCircle claclassNiv)| reame="Circle claclassNl.map(e => ({
        if (item.currentaveSucceeSuccecei = use  li =iloNota,
  listaPorEscaue) {
.tri);ame="Circle claclassNsNv className="Circle claclassNsNsNatrelec={ero] id}eite p-4 sm:00'
          }50">ame="Circle claclassNsNsNsNstdeite p-4 sm:tex2lord-x3miboldbg-sla-e<xundedsono">ame="Circle claclassNsNsNsNuc{ero] eriod let n {
}.tipo,
                    </td>ame="Circle claclassNsNsNsNstdeite p-4 sm:tex2lord-x3miboldbg-sla7e-1undeds-cent">ame="Circle claclassNsNsNsNuc{ero] mbre}.tipo,
                    </td>ame="Circle claclassNsNsNsNstdeite p-4 sm:tex2lord-x4dunded-lg flex over:bg-sla900">ame="Circle claclassNsNsNsNuc{ero] oDetect.tipo,
                    </td>ame="Circle claclassNsNsNsNstdeite p-4 sm:tex2lord-x3miboldbg-sla-e<xundedsono over:[10px]">ame="Circle claclassNsNsNsNuc{ero] nota: t.tipo,
                    </td>ame="Circle claclassNsNsNsNstdeite p-4 sm:tex2lord-x3">ame="Circle claclassNsNsNsNuc{ero] oDt  ?sName="Circle claclassNsNeSuccecessMsghite p-4 sm{`inline-bame=rd-x2nt-s0fonr bordermdlate-200undedflex over:x acte  li.bg}acte  li.over}acte  li.ate-20}`}>ame="Circle claclassNsNeSuccesNuc{ero] oDt }.tipo,
                        s/button>

        )}














)| reame="Circle claclassNsNeSuccecessMsghite p-4 sm"over:bg-sla4e<xitacti">Sin c     </button>
           )}












)}ame="Circle claclassNsNsN  </td>ame="Circle claclassNsNsNsNstdeite p-4 sm:tex2lord-x4diboldbg-sla-e<xitacti">ame="Circle claclassNsNsNsNuc{ero] "
      };
    }n {
}.tipo,
                    </td>ame="Circle claclassNsNsN</trckCircle claclassNivididades,                  })n>

        )}




)}kCircle claclassN</tbodyon>

        )}

 seSta      {s   )}

      {/* 1.="="sveSucc     )}

      {/* 1. SUGERENCIAS BTENDANCE REPORT
  const bimestrveReportTab === 'sugerencias' && 'alumnoin-cargar';
v className="space-y-4">
          <d5">ame="Circlebg-white p-4 sm:p-5 rounded-xr border-slate-200 shadow-xs flex flex-wrap gap-1">
        ce-x-1.5 tran<butiv className="="spac className="="="slabel htmlFor="= item.-att 

  re"e-y-4">
    over: mdunded-lg flex over:bg-sla5e-1up, ccase bame=rmbd1v className="="="
  Alumn n>

        )}

 label className="="="s

  re>{saveSucceeSucceid="= item.-att 

  re">{saveSucceeSucceimestex.`);
    // Selecte>{saveSucceeSucceetAh"w-tex(eessMsg(nu`);
    // Select && Number    et.imest))e>{saveSucceeSucceite p-4 sm:p-5bg-sla-elate-200 shadow-xs fl3800 px-4bg-sla9x fover: mditems-centeed-xundedflex m   w-[220px]">{saveSucceeSucn>{saveSucceeSucce{ap(student => {
    ipo: .tipo,
            sopudentlec={scurrent}eimestex.current}ckCircle claclassNividN° {scurrent}e- {sca'
   }ame="Circle claclass/opudenn>{saveSucceeSucce))e>{saveSucceeSuc</b`);
 ccme="Circle csveSuccessMsg me="="spac className="="="slabel htmlFor="bim-att 

  re"e-y-4">
    over: mdunded-lg flex over:bg-sla5e-1up, ccase bame=rmbd1v className="="="
 
  const n>

        )}

 label className="="="s

  re>{saveSucceeSucceid="bim-att 

  re">{saveSucceeSucceimestex.`);
   
  const stue>{saveSucceeSucceetAh"w-tex(eessMsg(nu`);
   
  const stuber    et.imest)e>{saveSucceeSucceite p-4 sm:p-5bg-sla-elate-200 shadow-xs fl3800 px-4bg-sla9x fover: mditems-centeed-xundeds-cent">{saveSucceeSucn>{saveSucceeSucce{ => b.nomb
   bipo: .tipo,
            sopudentlec={bdoDetectaimestexbdoDetectckCircle claclassNivid{bdoDetecta({_ESTADOS(bimestre)} al {_ESTADOS(bifin)})n>

        )}




s/opudenn>{saveSucceeSucce))e>{saveSucceeSuc</b`);
 ccme="Circle csveSucc{/* 1.="="sveSuccessMsg me="AS B= useMemo( () =>    dseeReportTabme="bg-white p-4 sm:g    g       sd-xl bg       sd4 lgbg       sd6n<but3v className="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSucssMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesn rso,s Porrespond</button>

        )}

pe-y-4">
    over:nteritemflex over:bg-sla9x fmtd1v {l.lengt= useMemo(() =>. noCorres}
 p className="="sveSucc{/* 1.="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSucssMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesnPles / co (P)d</button>

        )}

pe-y-4">
    over:nteritemflex over:r borderte-1mtd1v {l.lengt= useMemo(() =>. }
 p className="="sveSucc{/* 1.="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSucssMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesn       o (A)d</button>

        )}

pe-y-4">
   {`over:nteritemflex mtd1 ${l.lengt= useMemo(() =>.ap(e 5mpu'over:rosla6e-1undedverraflex'00 hover:bg-sla8e-'}`}>ame="Circle clacl{l.lengt= useMemo(() =>.a}ame="Circle clacl{l.lengt= useMemo(() =>.ap(e 5mv casMsghite p-4 sm:over: mdmld1 over:rosla-e<sn(≥ 5 </butto}n>

        )}

 p className="="sveSucc{/* 1.="="="sg-white p-4 sm:p-5 rounded fonr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eSucssMsghite p-4 sm:over:[11px] unded-lg flex over:bg-sla4e-1up, ccasesnT  d>
 / Retirosd</button>

        )}

pe-y-4">
    over:nteritemflex over:a"Insrte-1mtd1v {l.lengt= useMemo(() =>.r}a/l{l.lengt= useMemo(() =>.r}
 p className="="sveSucc{/* 1.="="="sg-white p-4 sm:p-5r border-emerald-200 text-emerald-800ed fonr border-sllex-wrap "n>Notas Sin eSucssMsghite p-4 sm:over:[11px] undedflex over:r border7e-1up, ccasesn n-cargar' s/ pctCorres/button>

        )}

pe-y-4">
    over:nteritemverraflex0 px-4 py-3 roundemtd1v {l.lengt= useMemo(() =>.   pctCorre}
 p className="="sveSucc{/* 1.="="="sg-white p-4 sm:p-5ite s50late-200 shadowite s2e-1ed fonr border-sllex-wrap "n>Notas Sin eSucssMsghite p-4 sm:over:[11px] undedflex over:ite s7e-1up, ccasesn n-cargar' s/Porrespond</button>

        )}

pe-y-4">
    over:nteritemverraflex0 px-4ite sundemtd1v {l.lengt= useMemo(() =>.   p};
  }, [cu}
 p className="="sveSucc{/* 1.="="sveSuccessMsg me="AS BChronologiitabTugereeReportTabme="bg-white p-4 sm:p-5 roundr border-slate-200 shadow-xs flex flex-col md0'
 flcolhiddenv className="="space-y-4">
    ordep-5bg-sla-elate-20-b0 shadow-xs flex fundedflex over:x a px-4bg-sla7e-1up, ccase track;

-widra">ame="Circle claHesportivigo(
ón porigo(
ón>{saveSucceeSs/     {/* 1.="="="space-y-4">
    0'
 flcolx-auto max-h-[50vh]v className="="="sSugereite p-4 sm:m   w-full ncia)  < ncia)  -xs flex fover: meckCircle claclassNathea)eite p-4 sm:p-5 roundover:bg-sla6e-1unded-lg flex over:left sticky top-0eckCircle claclassNsNatrckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3">TADOS</thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3">DíS</thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3">Bnst e</thckCircle claclassNsNsNatheite p-4 sm:tex2lord-x3">),    </thckCircle claclassNsN</trckCircle claclassN</thea)ckCircle claclassNatbodyeite p-4 sm:ncia)  < ncia)  -xs fl1e-1p-5 rouneckCircle claclassNsN{l.lengt= useMemo(() =>.
      p  conif (item.currentaveSucceeSuccei = usinf    INFO_ESTADOS_PRESENTISMO[ero] no    ];     }
    ucceeSuccev className="Circle claclassNsNatrelec={ero] =     
    + ero] =     
onst e}eite p-4 sm:00'
          }50">ame="Circle claclassNsNsNstdeite p-4 sm:tex2rd-x3mundedsono  items-centeover:bg-sla6e-">ame="Circle claclassNsNsNsN{_ESTADOS(ero] =     
eriod)}ame="Circle claclassNsNsNa/td>ame="Circle claclassNsNsNatdeite p-4 sm:tex2rd-x3miboldbg-sla7e-1capitactze">ame="Circle claclassNsNsNsN{ero] =     
dia}ame="Circle claclassNsNsNa/td>ame="Circle claclassNsNsNatdeite p-4 sm:tex2rd-x3miboldbg-sla-e<xundedsono">ame="Circle claclassNsNsNsN{ero] =     
onst e}ame="Circle claclassNsNsNa/td>ame="Circle claclassNsNsNatdeite p-4 sm:tex2rd-x3">ame="Circle claclassNsNsNsNs
Msghite p-4 sm{`inline-bame=rd-x2font-s0fonr bordermdlate-200undedflex over:x actinf .bg}actinf .over}actinf .bte-20}`}>ame="Circle claclassNsNeSuccetinf .labelta({inf .d>
c})n>

        )}




        s/button>

        )}










a/td>ame="Circle claclassNsN</trckCircle claclassNividades,                })}kCircle claclassN</tbodyon>

        )}

 seSta      {s   )}

      {/* 1.="="sveSucc     )}

      {/* 1. SUGERENCIAS B REPORT
  const [pendinveReportTab === 'sugerencias' &&           ?
v className="ste] = uugerensSecudent/  {/* 1. SUGERENCIAS B5.RT
  const bimestrveReportTab === 'sugerencias' && '         ?
v className="s= useMemo(ugerensSecudent/  {/* 1. SUGERENCIAS B6S REPORT
  const unloadeveReportTab === 'sugerencias' && (         ?iv className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xr border-slate-200 shadow-xs flex flex-wrap "n>Notas Sin eS<h3e-y-4">
    over:bmx itemflex over:bg-sla9x "r</span>
         poriAa =>
   </h3n>Notas Sin eS<pe-y-4">
    over: mdover:bg-sla-e<sn>{saveSucceeSucMu
     tods.ry-4 aa =>
      qsttiún t   en a'
   ss, s para $vacíS
riodx.`);
   ro}`];.
tas Sin eSuc
 pcc{/* 1.="="sveSuccessMsg me="A= useMemo(() =>as;

   ' &&0m?sName="Circle csg-white p-4 sm:p-5r border-emerald-200 text-emerald-800ed8nr border-slover:.5 tradsver: py-3 roundv className="="="ssName="w-4 h-4 text-emera8 h-8 over:r borderte-1mx-auto mb-2span>Notas Sin eSuc<pe-y-4">
    undedflex over:sm"> notTods.ry-4 aa =>
      dedx.`);
   ro}`]; t   en para $sinCarga.
 p className="="sveSucc{/* 1.="=" | reame="Circle cspace-y-4">
          <div className="me="A= useMemo(() =>a cong(() ipo: .tipo,
          spacelec={g(() .aa =>
    id}eite p-4 sm:p-5 roundr border-slate-200 shadow-xs flex flex-col mded-xl     <d3">ame="Circle claclas
pace-y-4">
    r spa-row md:ismms-center smmtify-betwflex-col md:flex-ro pb-2late-20-b0 shadow-xs fl1e-1<but2">ame="Circle claclassNspac className="="="s Sin eS<h4e-y-4">
    over: mdundedflex over:bg-sla9x "r{g(() .aa =>
    oDetect</h4 className="="="s Sin eS<sMsghite p-4 sm:over:[11px] over:bg-sla-e<sn>{saveSucceeSucceme="me="Ag(() .aa =>
    mbre} •"Ag(() .aa =>
     tipo: } •"E
      Ag(() .aa =>
    nota: t.tipo,
                s/button>

        )}






</     {/* 1.="="="="Sin eS<sMsghite p-4 sm:p-5a"Insr-e over:a"Insrundeate-200 shadowa"Insrex fover: mdundedflex d-x2font-s1dr bordermdl.`)f2s   tsn>{saveSucceeSucceme="meAg(() .: missing });
  as;

  }estadoDlifisiname="Circle claclassNs/button>

        )}




sveSuccessMsg me="="laclas
pace-y-4">
    r spa-row      <but2rdtd1v ame="Circle claclasmeAg(() .: missing });
  a con cono: .tipo,
                <sMsghlec={alcurrent}eite p-4 sm:        }`}
miboldbg-sla7e-1d-x2nt-s1dr bordermdlium flex items-cent">ame="Circle claclassNsNsNN° {alcurrent}e{alca'
   }ame="Circle claclassNsNs/button>

        )}






))}.tipo,
            </     {/* 1.="="="="Si</     {/* 1.="="="="))}.tipo,
      sveSucc{/* 1.="=" SU     )}

      {/* 1. SU )}

      {/ade};
