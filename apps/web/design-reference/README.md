# Design Reference — Mentorly

Archivos JSX extraídos del HTML standalone `Mentorly _standalone_.html`. Se usan como **fuente de verdad visual** para construir los componentes React reales.

## Mapeo archivo → contenido

| Archivo | Contenido | Úsalo para |
|---|---|---|
| `mentorly_1c0bb480.js` | Iconos custom (objeto `I`) | Componente `<Icon>` / biblioteca íconos |
| `mentorly_e6efb164.js` | Mock data (`INTERNS`, `TASKS`, `ACTIVITY`, `BITACORA`, `KPI_SCORES`) | Entender shape esperado, estados demo |
| `mentorly_4dac718b.js` | Primitives (Avatar, Badge, Btn, SectionTitle) | Traducir a `src/components/ui/` |
| `mentorly_c5f53610.js` | Shell: Sidebar, Topbar, CommandPalette, NAV, ROLES | `app/(app)/layout.tsx` + Cmd+K |
| `mentorly_ee668097.js` | Screens p1: Home, Tasks, Onboarding | `/mi-dia`, `/tareas`, wizards |
| `mentorly_1e741c75.js` | Screens p2: Bitácora, Mentoría | `/reportes-diarios`, `/mentoria` |
| `mentorly_3d1a4e4d.js` | Screens p3: Evaluaciones, Analítica, Automatización, Mobile | resto Fase A/B |

## Decisiones adoptadas

- **Paleta**: paper warm (`--bg:#f3efe7`, `--ink:#2a2320`) con accents intercambiables (terracotta/ink/olive/cobalt). Por defecto cobalt `#3a5f8a` (el docx pedía turquesa #0891B2; se cambia por esta línea paper más cálida).
- **Fuentes**: `Inter Tight` (sans, variable), `Instrument Serif` italic para display, `JetBrains Mono` para IDs/números.
- **Radii**: 4/6/10/14. **Shadows**: sutiles, chroma cálida.
- **Roles** modelados en UI: `intern`, `lead`, `hr` (sidebar rol-contextual).

## Cómo traducir

1. No copiar estilos inline — extraer a Tailwind + CSS vars en `globals.css`.
2. No copiar mock data — usar las APIs reales (`/api/v1/...`).
3. Mantener estructura de layouts; cambiar JSX crudo → componentes shadcn tipados.
