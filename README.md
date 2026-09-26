# Registro Escolar — notas, presentismo y seguimiento de clases

App web para **docentes de secundaria** (pensada para CABA / Argentina) que junta en un solo lugar lo que suele vivir en planillas dispersas: notas bimestrales, presentismo por bloques horarios y el seguimiento diario de cada clase.

> **Demo pública sin datos reales.** La nómina de ejemplo usa nombres ficticios (`García Demo Ana`, `Pérez Ejemplo Luis`, etc.). Cada docente carga su propia lista de alumnos.

---

## Qué resuelve

Pasar de varias planillas (notas, toma, seguimiento) a **una sola app** donde podés:

- Cargar y consultar **notas** por actividad y bimestre (escalas conceptuales y numéricas 1–10).
- Tomar **presentismo por bloques** (LUN, MAR, MIE, etc.) según el curso.
- Llevar **seguimiento de clases** en Markdown (objetivos, actividades, “hasta dónde llegamos”).
- **Importar planificaciones multidía** desde un `.md` (ver [PLANIFICACION.md](./PLANIFICACION.md)).
- Generar **informes** de pendientes y asistencia.
- Guardar datos en **Firebase** del docente (o trabajar en local según configuración).

## Para quién es

Docentes de secundaria que quieran digitalizar el registro del día a día sin depender solo de Sheets sueltas. El calendario demo incluye feriados y receso 2026 de Argentina; los cursos de ejemplo (`35 TM`, `42 TM`, …) se pueden adaptar.

## Qué NO incluye este repo

- **No** hay nombres reales de estudiantes, emails de alumnos, DNI, teléfonos ni domicilios.
- **No** hay API keys ni configuración Firebase real (solo [`.env.example`](./.env.example)).
- **No** subas backups ni exports con nóminas reales a este (ni a ningún) repositorio público.

Los datos de tu curso quedan en **tu** proyecto Firebase / almacenamiento local.

---

## Cómo correrla en local

Requisitos: Node.js 18+ (o Bun).

```bash
# 1. Clonar
git clone https://github.com/kekule91/registro-escolar.git
cd registro-escolar

# 2. Instalar
npm install
# o: bun install

# 3. Variables de entorno
cp .env.example .env
# Completá VITE_FIREBASE_* con TU proyecto Firebase (consola Firebase → Configuración del proyecto).
# GEMINI_API_KEY solo si usás funciones de IA.

# 4. Desarrollo
npm run dev
# Abre http://localhost:3000
```

Scripts útiles:

| Comando        | Qué hace              |
|----------------|-----------------------|
| `npm run dev`  | Servidor de desarrollo |
| `npm run build`| Build de producción   |
| `npm run lint` | Chequeo TypeScript    |

### Firebase (resumen)

1. Creá un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Activá Authentication (si lo usás) y Firestore.
3. Copiá la config web a `.env` (nunca la subas al repo).
4. Las reglas de ejemplo están en [`firestore.rules`](./firestore.rules): adaptalas a tu caso.

---

## Privacidad (importante)

- Este código es **herramienta**, no un dataset escolar.
- No publiques `.env`, dumps de Firestore ni CSV con alumnos.
- `.gitignore` ya ignora `.env*` (excepto `.env.example`).
- Si forkeás y cargás tu nómina, mantené el fork **privado** o sanitizá antes de hacer push.

---

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4
- Firebase (Auth / Firestore)
- Markdown para planificaciones (`react-markdown`)

## Licencia

[MIT](./LICENSE) — podés usarla, adaptarla y compartirla citando la licencia.

## Autor

**Federico Garberi** · [github.com/kekule91](https://github.com/kekule91)  
Portal docente: [quimica-y-mas-profe-garberi.pages.dev](https://quimica-y-mas-profe-garberi.pages.dev/)

¿Docente y te sirve? Dale ⭐ al repo o abrí un issue con ideas. El objetivo es que más colegas dejen de pelearse con planillas sueltas.
