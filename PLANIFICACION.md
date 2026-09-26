# Formato PLANIFICACION.md — Estructura y Guía de Importación Multidía

Este documento define la especificación para la carga de planificaciones de clases de múltiples días para el sistema escolar **Registro de Notas y Presentismo 2026**.

---

## 📌 1. ¿Cómo funciona la importación multidía?
El importador permite a los docentes subir un único archivo `.md` (Markdown) o pegar texto libre que contenga las planificaciones de varias fechas de un curso.

Al confirmar la importación:
1. Se crea o actualiza **un registro de clase por cada fecha** detectada en el archivo.
2. Se asigna el curso seleccionado (`curso`), la fecha (`fecha`) y el contenido de la clase (`planMd`).
3. **Preservación de datos previos**: Si ese día ya tenía registros de *Observaciones del día* o *Hasta dónde llegamos*, **se conservan intactos** a menos que el archivo contenga explícitamente esas secciones.
4. **Seguridad**: Los días que no estén en el archivo importado **no se tocan ni se eliminan**.

---

## 🏷️ 2. Estructura Obligatoria por Día

Cada clase debe comenzar con un encabezado de Markdown (`#`, `##` o `###`) que contenga **obligatoriamente una fecha válida**.

### Formatos de encabezado reconocidos:
- `## [YYYY-MM-DD] Título descriptivo` *(Formato recomendado)*
- `## YYYY-MM-DD: Título de la clase`
- `## YYYY-MM-DD - Título de la clase`
- `## Fecha: YYYY-MM-DD | Título`
- `## DD/MM/YYYY: Título de la clase` (ej: `## 02/03/2026: Diagnóstico Inicial`)
- `## Clase 1 (2026-03-02): Título de la clase`

> ⚠️ **Validación de errores:** Si un encabezado carece de fecha (por ejemplo: `## Clase 1: Introducción`), el sistema lo marcará en rojo como error indicando la línea y solicitará corregirlo con una fecha válida antes o durante la vista previa.

---

## 🧭 3. Detección Automática de Curso (Opcional)

Si incluyes al inicio del archivo una línea con el nombre del curso, la interfaz lo seleccionará automáticamente:
```markdown
# Planificación Anual
Curso: 35 TM
```
*(Cursos disponibles en el sistema: `35 TM`, `42 TM`, `42 TT`)*

---

## 📝 4. Secciones Especiales Reconocidas dentro de Cada Día (Opcionales)

Todo el texto entre un encabezado de día y el siguiente encabezado se guarda como **Planificación de la clase** (`planMd`).

Si deseas cargar de forma anticipada notas de avance o recordatorios de aula:
- `### Hasta dónde llegamos` o `**Hasta dónde:** ...`  
  → Se asigna al campo *Hasta dónde llegamos hoy* (que genera el carry-over *“Continuamos desde...”* en la siguiente sesión).
- `### Observaciones` o `**Observaciones:** ...`  
  → Se asigna al campo *Observaciones del día*.

Si no incluyes estas secciones, se dejan vacíos para nuevos registros o se preservan los valores que ya tenías guardados.

---

## 📄 5. Archivo de Ejemplo Completo

```markdown
# Planificación Química - Ciclo 2026
Curso: 35 TM

## [2026-03-02] Diagnóstico Inicial y Encuadre Pedagógico
### 🎯 Objetivos de Aprendizaje
- Presentar el programa anual, criterios de evaluación y normas de laboratorio.
- Evaluar competencias previas en magnitudes físicas y químicas.

### ⏱️ Secuencia de Actividades
1. **Inicio (15 min):** Bienvenida, presentación de la materia y conformación de parejas de trabajo.
2. **Desarrollo (50 min):** Lectura dialogada del contrato pedagógico y resolución de la guía diagnóstica.
3. **Cierre (15 min):** Puesta en común de los ejercicios 1 y 2 en el pizarrón.

### 📦 Recursos
- Guía diagnóstica impresa y carpeta de clase.

---

## [2026-03-04] Propiedades de la Materia y Estados de Agregación
### 🎯 Objetivos
- Diferenciar propiedades intensivas y extensivas.
- Explicar los estados sólido, líquido y gaseoso mediante el modelo cinético-corpuscular.

### ⏱️ Secuencia de Actividades
1. **Inicio:** Aclaración de dudas de la guía diagnóstica.
2. **Desarrollo:** Experiencia demostrativa con hielo, agua y vapor. Confección de cuadro comparativo.
3. **Cierre:** Resolución grupal de preguntas de aplicación.

### Observaciones
Llevar vaso de precipitado y termómetro de laboratorio para la demostración.

---

## [2026-03-09] Sistemas Materiales: Homogéneos y Heterogéneos
### 🎯 Objetivos
- Identificar fases y componentes en diversos sistemas materiales.
- Proponer métodos físicos de separación de mezclas.

### ⏱️ Secuencia de Actividades
1. **Inicio:** Discusión sobre mezclas cotidianas (agua con sal, granito, emulsiones).
2. **Desarrollo:** Práctica en mesa de laboratorio: filtración, decantación e imantación.
3. **Cierre:** Confección del informe breve de laboratorio.
```

---

## 🚀 6. Pasos para Cargar en la Aplicación
1. En la barra superior, haz clic en la pestaña **Seguimiento de Clase**.
2. Presiona el botón **“Cargar planificación (varios días)”**.
3. Selecciona tu archivo `.md` con el selector de archivos o pega el contenido en el área de texto.
4. Revisa la **Vista previa interactiva** con el desglose de días válidos, fechas y títulos detectados.
5. Haz clic en **“Confirmar importación”**. Las clases quedarán registradas inmediatamente y sincronizadas.
