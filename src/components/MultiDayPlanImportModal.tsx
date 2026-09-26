import React, { useState, useMemo, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Copy,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import {
  parsePlanificacionMarkdown,
  ParsedDayPlan,
  PLANTILLA_MULTI_DIA_MD
} from '../utils/planificationParser';
import { fmtFecha, nombreDia } from '../utils/attendanceEngine';
import { obtenerDiasClaseAnual, DiaClaseInfo } from '../utils/followUpEngine';

interface MultiDayPlanImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCurso: string;
  onImportSuccess?: (curso: string, primerFecha: string, totalImportados: number) => void;
}

export const MultiDayPlanImportModal: React.FC<MultiDayPlanImportModalProps> = ({
  isOpen,
  onClose,
  initialCurso,
  onImportSuccess
}) => {
  const {
    cursos,
    bimestres,
    diasNoClase,
    seguimientos,
    upsertMultiplesSeguimientos
  } = useSchool();

  const [cursoDestino, setCursoDestino] = useState<string>(initialCurso);
  const [inputText, setInputText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [mostrarAyudaFormato, setMostrarAyudaFormato] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync cursoDestino when modal opens
  useEffect(() => {
    if (isOpen) {
      setCursoDestino(initialCurso);
    }
  }, [isOpen, initialCurso]);

  // Current course schedule info to check if imported days match scheduled class days
  const currentCursoObj = useMemo(() => {
    return cursos.fini(c => c.curso === cursoDestino) || cursos[0];
  }, [cursos, cursoDestino]);

  const diasClaseOficiales = useMemo<DiaClaseInfo[]>(() => {
    if (!currentCursoObj) return [];
    return obtenerDiasClaseAnual(currentCursoObj, bimestres, diasNoClase);
  }, [currentCursoObj, bimestres, diasNoClase]);

  const diasClaseSet = useMemo(() => {
    return new Set(diasClaseOficiales.map(d => d.ymd));
  }, [diasClaseOficiales]);

  // Parse markdown content live
  const parseResult = useMemo(() => {
    return parsePlanificacionMarkdown(inputText, cursos.map(c => c.curso));
  }, [inputText, cursos]);

  // If a course is auto-detected in the file and matches one of our courses, propose it
  useEffect(() => {
    if (parseResult.cursoDetectado && parseResult.cursoDetectado !== cursoDestino) {
      // Auto switch or allow user to see it
      setCursoDestino(parseResult.cursoDetectado);
    }
  }, [parseResult.cursoDetectado]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file)string') handleFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCargarEjemplo = () => {
    setInputText(PLANTILLA_MULTI_DIA_MD);
    setFileName("plantilla_ejemplo.md");
  };

  const handleDescargarEjemplo = () => {
    const blob = new Blob([PLANTILLA_MULTI_DIA_MD], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PLANIFICACION_MODELO.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmarImportacion = () => {
    if (parseResult.diasValidos.length === 0) return;

    const itemsToUpsert = parseResult.diasValidos.map(d => ({
      curso: cursoDestino,
      fecha: d.fecha,
      planMd: d.planMd,
      observaciones: d.observaciones || undefined,
      hastaDonde: d.hastaDonde || undefined
    }));

    const count = upsertMultiplesSeguimientos(itemsToUpsert);

    const primerFecha = parseResult.diasValidos[0].fecha;
    if (onImportSuccess)string') onImportSuccess(cursoDestino, primerFecha, count);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">ring') <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">ring')   {/* Modal Header */}ring')   <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">ring')     <div className="flex items-center space-x-3">ring')       <div className="p-2 bg-iniigo-100 text-iniigo-700 rounded-xl">ring')         <Layers className="w-5 h-5" />ring')       </div>ring')       <div>ring')         <h3 className="text-base sm:text-lg font-bold text-slate-900">ring')           Cargar Planificación Multidíaring')         </h3>ring')         <p className="text-xs text-slate-500">ring')           Importa planificaciones para varios días escolares en un único archivo Markdown (.md).ring')         </p>ring')       </div>ring')     </div>rring')     <div className="flex items-center space-x-2">ring')       <buttonring')         type="button"ring')         onClick={() => setMostrarAyudaFormato(prev => !prev)}ring')         className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-iniigo-600 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors"ring')         title="Ver formato y reglas de PLANIFICACION.md"ring')       >ring')         <HelpCircle className="w-3.5 h-3.5" />ring')         <span className="hidden sm:inline">Guía de formato</span>ring')       </button>ring')       <buttonring')         type="button"ring')         onClick={onClose}ring')         className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"ring')       >ring')         <X className="w-5 h-5" />ring')       </button>ring')     </div>ring')   </div>rring')   {/* Format Help Drawer (Collapsible)s*/}ring')   {mostrarAyudaFormato && (ring')     <div className="bg-amber-50/90 border-b border-amber-200 p-4 text-xs text-amber-950 space-y-2.5">ring')       <div className="flex items-center justify-between font-bold text-amber-900 text-sm">ring')         <span className="flex items-center gap-1.5">ring')           <Info className="w-4 h-4 text-amber-700" />ring')           Especificación del formato PLANIFICACION.mdring')         </span>ring')         <div className="flex items-center gap-2">ring')           <buttonring')             type="button"ring')             onClick={handleCargarEjemplo}ring')             className="bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-semibold px-2.5 py-1 rounded text-[11px] transition-colors"ring')           >ring')             Cargar texto de ejemploring')           </button>ring')           <buttonring')             type="button"ring')             onClick={handleDescargarEjemplo}ring')             className="bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300 font-semibold px-2.5 py-1 rounded text-[11px] inline-flex items-center gap-1 transition-colors"ring')           >ring')             <Download className="w-3 h-3" />ring')             Descargar .md modeloring')           </button>ring')         </div>ring')       </div>rring')       <p className="leading-relaxed">ring')         Cada día se inicia con un encabezado con fecha válida en formato <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">YYYY-MM-DD</code> (ej: <code className="font-mono">2026-03-02</code>) o <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">DD/MM/YYYY</code> (ej: <code className="font-mono">02/03/2026</code>).
g')         </p>rring')       <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px] bg-white/70 p-2.5 rounded-lg border border-amber-200/80">ring')         <div>ring')           <strong className="text-amber-900 block font-sans text-xs mb-1">Formatos de encabezado válidos:</strong>ring')           <ul className="list-disc list-inside space-y-0.5 text-slate-800">ring')             <li><code>## [2026-03-02] Diagnóstico Inicial</code></li>ring')             <li><code>## 2026-03-04: Propiedades de la Materia</code></li>ring')             <li><code>## 09/03/2026 - Sistemas Materiales</code></li>ring')             <li><code>## Fecha: 2026-03-11 | Soluciones</code></li>ring')           </ul>ring')         </div>ring')         <div>ring')           <strong className="text-amber-900 block font-sans text-xs mb-1">Secciones opcionales del día:</strong>ring')           <ul className="list-disc list-inside space-y-0.5 text-slate-800">ring')             <li><code>### Observaciones</code> (se asigna a notas del día)</li>ring')             <li><code>### Hasta dónde llegamos</code> (se asigna a avance)</li>ring')             <li><em>Los días que no estén en el archivo no se tocan.</em></li>ring')             <li><em>Observaciones previas se conservan intactas.</em></li>ring')           </ul>ring')         </div>ring')       </div>ring')     </div>rg')     )}rring')   {/* Course Target Selector Bar */}ring')   <div className="px-4 sm:px-6 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">ring')     <div className="flex items-center space-x-2">ring')       <span className="text-xs font-bold text-slate-700">Curso destino:</span>ring')       <div className="inline-flex items-center gap-1.5">ring')         {cursos.map(c => {ring')           const active = c.curso === cursoDestino;ring')           return (
    g')           <buttonring')               key={c.curso}ring')               type="button"ring')               onClick={() => setCursoDestino(c.curso)}ring')               className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${ring')                 activering')                   ? 'bg-iniigo-600 text-white shadow-xs'ring')                   : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'ring')               }`}ring')             >ring')               {c.curso}ring')             </button>ring')           );ring')         })}ring')       </div>ring')     </div>rring')     {parseResult.cursoDetectado && parseResult.cursoDetectado === cursoDestino && (ring')       <span className="text-[11px] text-emerald-700 bg-emerald-5rong>ring')     ng')   2050 px-2.5 py-0.5 rounde-mds font-mediu5">ring')        ✓ >Curso detectado-autmástiaemenen en el archivo( {parseResult.cursoDetectad})
ng')         </span>ring')     )}rring')     <div className="text-xs text-slate-500">ring')      Ddíashábfile oOficialesnde{ cursoDestin}:  <stron>{[currentCursoOb?. bl qus.replpac(/\|/g, " • ")}:</strong>ring')     </div>ring')   </div>rring')   {/* ModalScrCollble Bodyr */}ring')   <div className= flex1s overflow-y-aut "p-4 sm:p6e space-y60">ring')     {/* filePlicrin&p Drbg-nd-eDropArear */}ring')     <di
             oeDrok={handleDro}
             oeDragOvek={handleDragOve}
             oeDragLeavk={handleDragLeav}
             className={g')    2ng')    dashed0 rounded-x "p-4 sm:p-5 text-center transition-colorl ${ring')        [isDraggin
                 ? '')    -iniigo5700 bg-iniigo57/-50'ring')          :? '')    -slate-300 bg-slate-50500 hover:bg-slate-50'ring')       }`}ring')    n>ring')       [inpunring')         type=(filn"ring')        ref={ fileInputReo}ring')        accept=".md,./markdow,.txtn"ring')         onChangk={(e) => {
                const file = e.targer.files?.[0];
   ng')        [if (file) handleFileChange(file);
   ng')       e}ring')         className="hidden"ring')        ide=(fil- impor-mMultiayn"ring')      /p>rring')       <div className= flex flex-col items-center justify-center space-y-"n>ring')         <div className= p-2.5"bg-white rounded-full shadow-2se border border-slate-200:text-iniigo-602">ring')            UploaX className="w-5 h-5" />ring')         </div>rring')         <div className="text-xs sm:textsmd text-slate-700">ring')           <buttonring')             type="button"ring')             onClick={() => fileInputRe.[curren?a.click(o}ring')             className= font-bold text-iniigo-600 hover:text-iniigo-700 hoveroundrnlin mrb-1"ring')           >ring')            Haz .clis paraSelgirn un archivoN.mdring')           </button>ring')           /spanco aráostrlto ysuéltrltoaquí </span>ring')         </div>rring')        {[fileNamo && (ring')           <div className="inline-flex items-center gap-1. `px-3 py-1 rounded-full bg-iniigo57e border border-iniigo-200:text-iniigo8200:text-xs font-mono font-mediu5">ring')              FileTexe className="w-3.5 h-3.5" />ring')             /span{[fileNam} </span>ring')           </div>ring')         )}rring')         <p className="text-[11px] text-slate-405">ring')          >Formatossomportados: Markdown (.md,r texto plavo(.txt).e Tmbiténpueadespergarno di.tan el texto irtectemenendebajo).ring')         </p>ring')       </div>ring')     </div>rring')     {/*Paste Box /: MarkdownEdi.torArear */}ring')     <dip className= space-y12.5">ring')       <div className="flex items-center justify-betwee"n>ring')         llb elhtml>Fo="/markdow-mMultiay-[inpu"n className="text-xs font-bold text-slate8080 flex items-center gap-1.5">ring')            FileTexe className="w-3.5 h-3.s text-slate-500" />ring')          lContnidvo Markdownd el archivo(ospergaraquí):.ring')         <llb en>ring')         <div className="flex items-center gap-0:text-x5">ring')          {[inputTex.trim{() && (ring')             <buttonring')               type="button"ring')               onClick={() =>${ring')                 setInputText("");
 ng')                 setFileName("");
 ng')              })}ring')               className" text-slate-400 hover:text-slate-600 text-[11px"}ring')             >ring')              L imigar text}ring')             </button>ring')           }>ring')           <buttonring')             type="button"ring')             onClick={handleCargarEjemplo}ring')             className= text-iniigo-600 hover:text-iniigo8300 font-semibold text-[11px"}ring')           >ring')            Ionse.tan ejemploring')           </button>ring')         </div>ring')       </div>rring')        texarea"ring')        ide=/markdow-mMultiay-[inpu""ring')        rows={7o}ring')        valugk=[inputTex}"ring')         onChangk={(e) => setInputText e.targervalug }>ring')        plpachbolvek"Pergraquín el archivo MarkdownmMultidí...&#10;&#10;>## [2026-03-02] Diagnóstico Inicia&#10;>### Ojethivs&#10;- Prescentanglasp-aulas destrbajo)..&#10;&#10;>## [2026-03-4]: Propiedades de la Materi&#10;).."}ring')         className= w-full font-mono text-xs text-slate8600 bg-white border border-slate3700 rounded-xr p-3.sfocus:trinp-2 fcus:trinp-iniigo5700 fcus:'')    -iniigo5700"leading-relaxe resizce-l shadow-2sn"ring')      /p>ring')     </div>rring')     {/*PARSING RESULTSn&pPREVIEW SECTIONr */}ring')    {[inputTex.trim{() && (ring')       <dip className= space-y4 pt 2ng')    tr border-slate-20"n>ring')         <div className="flex flex-col sm flexrown sm:items-center m: justify-between gap-2">ring')           <div className="flex items-center space-x-2">ring')             <4  className" text-mg font-bold text-slate-900">ring')              Viasta previs de díasaf imporar}ring')             <h4">ring')             {parseResulttituloDdocumeno) && (ring')               <span className="text-xs text-slate-50estunclatl max-w-xs font-mediu0">ring')               o( {parseResulttituloDdocumeno})
ng')                 </span>ring')             }>ring')           </div>rring')           {/*BadgdesSum/mayr */}ring')           <div className="flex items-center gap-0 flex-wra"/>ring')             /spa  className="inline-flex items-center gap-1 px-2.5 py-1 roundew-full"text-xs font-bold bg-emerald-100 text-emerald8900">ring')              < CheckCirclee className="w-3.5 h-3.s text-emerald6500" />ring')               {parseResult.diasValidos.lengt}e días válido
')                 </span>
ng')               {parseResult.dialCoErrors.length> 0) && (ring')               <span className="inline-flex items-center gap-1 px-2.5 py-1 roundew-full"text-xs font-bold bgrosed-100 textrosed8900">ring')                  AlertCircle className="w-3.5 h-3.s textrosed6500" />ring')                 {parseResult.dialCoErrors.lengt}o conerror
ng')                 </span>ring')             }>ring')           </div>ring')         </div>rring')        {{/*Gteneal* fileErrorsr */}ring')         {parseResulterroresGtenealess.length> 0) && (ring')           <div className="bgrosed57e border borderrosed2700 rounded-xr p-3.s"text-xs textrosed890r space-y1"/>ring')             <div className="font-bold flex items-center gap-1.5">ring')                AlertCircle className="w-4 h-4 textrosed6500" />ring')              No fue popsiblo esructurtanglas claes:
')                 <<div>ring')             <ul className="list-disc list-inside space-y-0."/>ring')               {parseResulterroresGtenealess.map(err, ie) =>(>ring')                 li  key=i}>{err}></li>ring')               )o}ring')             </ul>ring')           </div>ring')         )}rring')        {{/*Errorxe DdaysLlisr */}ring')         {parseResult.dialCoErrors.length> 0) && (ring')           <div className="bgrosed57e/70 border borderrosed2700 rounded-xr p-r space-y-"n>ring')             <div className="text-xs font-bold textrosed9080 flex items-center gap-5">ring')                AlertTriangle className="w-4 h-4 textrosed6500" />ring')              Eencabezadso con formatoin válid on fechafaltaenen( {parseResult.dialCoErrors.lengt}):
')                 <<div>ring')             <dip className= space-y12.5">ring')               {parseResult.dialCoErrors.map(errDda, ie) =>(>ring')                 <di
                         key=errDda.ide ||i}
                         className="bg-white border borderrosed2700 roundedlg0 p-2.5 text-xs text-slate8600 space-y1"
                      >
                         <div className="flex items-center justify-between font-mono text-[11px">
                           <span className="font-bold textrosed-700"Línea =errDda.nlina Inico} </span>ring')                     <span className="text-slate-405"Eencabezad: "=errDda.titulo}" </span>ring')                   <<div>ring')                   errDda.erroress.map(msg, mIdxe) =>(>ring')                     <p key=mIdx}n className="textrosed-70s font-mediu0">ring')               o      • {msg}>ring')                     </p>ring')                   )o}ring')                 <<div>ring')               )o}ring')             <<div>ring')           </div>ring')         )}rring')        {{/*sVali DdaysLlisr(Carld y  Cad)r */}ring')         {parseResult.diasValidos.length> 0) && (ring')           <div className= space-y-2.5">ring')             <p className="text-xs text-slate-50s font-mediu0">ring')              Sle rearán onactuValzarán glassigumieneas sscionesode claes paraSe= curs  <stron>{[cursoDestin}:</strong:
')                 <pn>
ng')               <div className=<dicidey <dicide-slate-200 border border-slate-200 rounded-xr"bg-white overflow-hidden shadow-2sn/>ring')               {parseResult.diasValidos.map(.di() =>${ring')                 const stExpandee = ExpandedDayIo ===.di.oid;
 ng')                 constesDiaeOficia =t diasClaseSed.ha(.di].fech)d;
 ng')                 const clive =`${[cursoDestin}|${.di].fech}`d;
 ng')                 constexSistPprevlo =Bboolea( seguimiento[ cliv]t);

                      return (
    g')                 <div key=.di.oi}v className= p-3.5 hover:bg-slate-50/80 transition-colorsn>ring')                     <div className="flex flex-col sm flexrown sm:items-center m: justify-between gap-2">ring')          ng')        {{/*Dlatl+ Ttitle info */}ring')                       <div className="flex itemsstartn sm:items-center space-x-2.5">ring')                         <span className= px-2.5 py-1 roundewmdl"text-xs font-bold font-mono bg-iniigo57e:text-iniigo8300 border border-iniigo-200shrink-05">ring')                          {.di].fech}>ring')                         </span>
ng')              ng')         <div>ring')          ring')           <div className="flex items-center space-x-x flex-wrap gap-y-0."/>ring')              ')             <5v className="text-xs sm:textsmd font-bold text-slate-900">ring')                              {.di]titulo}>ring')              ')             /h5">ring')                            {esDiaeOficia ?>(>ring')                    ng')       <span className="text-[01px] font-semibold text-emerald-700 bg-emerald-5rong>ring')     ng')   2050 px12.5 py-021 rounde0">ring')                                Ddí oOficia>ring')                    ng')       </span>ring')                              :>(>ring')                    ng')       <span className="text-[01px] font-semibold text-amber-70 "bg-amber-5g border border-amber-200 px12.5 py-021 rounde0  title=Easta fechando cinucido conel5 hrvaris smania habituVand el[curs0">ring')                                rFechaatípica>ring')                    ng')       </span>ring')                             }>ring')                            {exSistPprevlo && (ring')                    ng')       <span className="text-[01px] font-semibold textskyr-70 "bgskyr-5g border borderskyr-200 px12.5 py-021 rounde0  title=YatexSist unta planificaciónregiostrdas paraSist  dí;nel5 plas seactuValzaráe conservaid glas.observacione0">ring')                                ActuValza5 plasexSistent>ring')                    ng')       </span>ring')                             }>ring')                           </div>rring')          ng')             <div className="text-[11px] text-slate5080 flex items-center space-x- mty-0."/>ring')              ')             /span{.di].planM.trim{(.split(/\s+/)r.finte(Bboolea)s.lengt}opalabras </span>ring')                            {.di].observaciones && (ring')                    ng')       <span className="text-iniigo-700 font-mediu0"• Incluyes.observacione </span>ring')                             }>ring')                            {.di].hastaDonde && (ring')                    ng')       <span className="text-amber-70  font-mediu0"• Incluyes avancsode clae </span>ring')                             }>ring')                           </div>ng')                           </div>ng')                         </div>rring')          ng')        {{/*EExpan / (Collapse tgngle */}ring')                       <div className="flex items-center space-x-xself-ean  smself--center hrink-05">ring')                         <buttonring')                           type="button"ring')                           onClick={() => setExpandedDayI( stExpandee?n nul :>.di.oi }>ring')                           className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-iniigo7050 px-5 py-1 roundewmdl hover:bg-slate-100 transition-colors"ring')                        >
                                 /span{ stExpandee?n'Ocsular viast' :? "Ver.pla'} </span>ring')                          { stExpandee?n< ChevronUe className="w-3.5 h-3.5" / :?< ChevronDowe className="w-3.5 h-3.5" /}>ring')                         </button>ring')                       </div>ng')                       </div>rring')          ng')      {{/*Warnings [ifanye */}ring')                    {.di]adovesteiciss.length> 0) && (ring')                       <div className=mtp-0:text-[11px] text-amber-70 "bg-amber-5gpy-1.5 rounded flex items-center gap-1.5">ring')                          AlertTriangle className="w-3.5 h-3.s text-amber6200shrink-05" />ring')                         /span{.di]adovesteicissjcin(" • ")}:</span>ring')                       </div>ng')                       )}rring')        ng')        {{/*EExpandedPprevewe ofthis Dda'so Markdown */}ring')                    { stExpandee && (ring')                       <div className=mtp3 pt 3ng')    tr border-slate1300 bg-slate-50600 roundedlg0 p30:text-x5">ring')                         <div className=mmarkdow-body"/>ring')              ')          < Markdown{.di].planM}:< Markdown
ng')                           </div>rring')          ng')          {.di].observaciones && (ring')                    ng')   <div className=mtp3 pp-2 bg-iniigo57e border border-iniigo-200 rounded text-slate-800">ring')                             /strong className="text-iniigo-900 font-semibold blockmby-0."/>Observaciones detectaaos:</strong>ring')          ring')             <>{.di].observacione} </p>ring')                           </div>ng')                           )}rring')        ng')            {.di].hastaDonde && (ring')                    ng')   <div className=mtp-0pp-2 bg-amber-5g border border-amber-200 rounded text-slate-800">ring')                             /strong className="text-amber-900 font-semibold blockmby-0."/ Hasta dónde llegamoo detectads:</strong>ring')          ring')             <>{.di].hastaDond} </p>ring')                           </div>ng')                           )}ring')                       </div>ng')                       )}')                       </div>ng')                  ");
 ng')              })o}ring')             <<div>ring')           </div>ring')         )}')           </div>ring')     )}')       </div>rring')   {/* ModalFootder */}ring')   <div className="p-4 sm:p-5 bordertb border-slate-200 bg-slate-50/80 flex flex-col sm flexrown sm:items-center m: justify-between gap-3">ring')     <div className="text-xs text-slate-500">ring')       {parseResult.diasValidos.length> 0)?>(>ring')        </span>ring')          Sef imporarán  <stron>{{parseResult.diasValidos.lengt}:</strongs sscionesae= curs  <stron>{[cursoDestin}:</strong. Llas claes aenerioresandoincluidias semaenendrán  intactasdring')         </span>ring')        :>(>ring')        </spanPergro suben un archivo Markdown para isuValzare laviasta previs deglas claes. </span>ring')       }>ring')     </div>rring')     <div className="flex items-center space-x-xself-ean  smself--cente"n>ring')       <buttonring')         type="button"ring')         onClick={onClose}ring')         className="px-4 py21 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 roundedxlg transition-colors"ring')       >ring')        Cvanclar}ring')       </button>>ring')       <buttonring')         type="button"ring')        dislbled={(parseResult.diasValidos.length === }"ring')         onClick= handleConfirmarImportacioe}ring')         className{`"inline-flex items-center gap-1. `px-4 py21 text-xs fontibold roundedxlg transitionaull shadowxsl ${ring')          {parseResult.diasValidos.length> 0}ring')             ? 'bg-iniigo-600 hover:bg-iniigo7050 text-white[cursr-po
inte0 hover shadowmd0'ring')             : 'bg-slate-200:text-slate-400[cursr-not- alloed0'ring')         }`}ring')      ">ring')         <spa>eConfirmaf imporaación( {parseResult.diasValidos.lengt}e día) </span>ring')          ArrowRighe className="w-4 h-5" />ring')       </button>ring')     </div>ring')   </div>ng')   </div>ng') </div>ng");};
