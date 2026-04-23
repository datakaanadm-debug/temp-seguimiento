// Mock data — named `mentorlyData` to avoid global scope collisions.

const INTERNS = [
  { id: "u1", name: "Ana Paredes",    initials: "AP", area: "Producto",    mentor: "Lucía R.",   tone: "#8a6b9e", progress: 72, risk: "ok",   streak: 14, week: [4,6,5,7,8,6,5] },
  { id: "u2", name: "Diego Herrera",  initials: "DH", area: "Ingeniería",  mentor: "Marco T.",   tone: "#3e7a6b", progress: 54, risk: "warn", streak: 3,  week: [3,2,4,3,5,4,3] },
  { id: "u3", name: "Valentina Cruz", initials: "VC", area: "Diseño",      mentor: "Sofía B.",   tone: "#c8532b", progress: 91, risk: "ok",   streak: 21, week: [6,7,8,7,8,9,7] },
  { id: "u4", name: "Mateo Ibáñez",   initials: "MI", area: "Marketing",   mentor: "Lucía R.",   tone: "#b8892a", progress: 38, risk: "risk", streak: 0,  week: [2,1,3,0,2,1,0] },
  { id: "u5", name: "Camila Rojas",   initials: "CR", area: "Ingeniería",  mentor: "Marco T.",   tone: "#456b7a", progress: 66, risk: "ok",   streak: 9,  week: [5,4,6,5,5,6,5] },
  { id: "u6", name: "Joaquín Peña",   initials: "JP", area: "Operaciones", mentor: "Sofía B.",   tone: "#a8432e", progress: 48, risk: "warn", streak: 5,  week: [3,4,3,5,3,4,3] },
];

const TASKS = [
  { id: "T-104", t: "Documentar flujo de onboarding v2",            status: "done",    prio: "med", assignee: "u1", due: "Hoy",          est: 3, spent: 3.2, tags: ["docs"] },
  { id: "T-112", t: "Maquetar dashboard ejecutivo — mobile",        status: "review",  prio: "high",assignee: "u3", due: "Mañana",       est: 8, spent: 6.5, tags: ["diseño","sprint-12"] },
  { id: "T-118", t: "Research: competidores SaaS de mentoría",      status: "doing",   prio: "med", assignee: "u1", due: "Vie 24",       est: 5, spent: 2.0, tags: ["research"] },
  { id: "T-121", t: "Integrar Slack con notificaciones de bitácora",status: "doing",   prio: "high",assignee: "u2", due: "Lun 27",       est: 6, spent: 4.5, tags: ["backend"] },
  { id: "T-122", t: "Preparar evaluación mensual — equipo Ing.",    status: "todo",    prio: "med", assignee: "u5", due: "Mié 29",       est: 2, spent: 0,   tags: ["hr"] },
  { id: "T-124", t: "Rediseñar componente de tarjeta de tarea",     status: "todo",    prio: "low", assignee: "u3", due: "—",            est: 3, spent: 0,   tags: ["diseño"] },
  { id: "T-126", t: "Workshop de productividad — contenido",        status: "todo",    prio: "med", assignee: "u4", due: "Jue 30",       est: 4, spent: 0,   tags: ["mentoría"] },
  { id: "T-128", t: "Escribir postmortem del incidente de login",   status: "blocked", prio: "high",assignee: "u2", due: "Vie 24",       est: 2, spent: 1.0, tags: ["postmortem"] },
  { id: "T-130", t: "Plan de aprendizaje Q2",                       status: "doing",   prio: "med", assignee: "u6", due: "Mar 28",       est: 5, spent: 1.5, tags: ["okr"] },
  { id: "T-132", t: "Sincronizar KPIs con People Ops",              status: "review",  prio: "med", assignee: "u5", due: "Hoy",          est: 1, spent: 0.8, tags: ["hr"] },
  { id: "T-134", t: "Manual de marca — sección voz",                status: "todo",    prio: "low", assignee: "u4", due: "Vie 1 may",    est: 6, spent: 0,   tags: ["marca"] },
  { id: "T-136", t: "Reporte semanal para Universidad San Martín",  status: "done",    prio: "med", assignee: "u1", due: "Lun 20",       est: 2, spent: 1.8, tags: ["universidad"] },
];

const STATUSES = [
  { id: "todo",    label: "Por hacer",  color: "var(--ink-3)",     bg: "var(--line-soft)" },
  { id: "doing",   label: "En curso",   color: "#9b3d1a",          bg: "var(--accent-soft)" },
  { id: "review",  label: "En revisión",color: "#b8892a",          bg: "var(--warn-soft)" },
  { id: "blocked", label: "Bloqueada",  color: "#a8432e",          bg: "var(--danger-soft)" },
  { id: "done",    label: "Hecha",      color: "#3d5428",          bg: "var(--ok-soft)" },
];

const ACTIVITY = [
  { who: "u3", action: "movió", obj: "T-112 → En revisión", when: "hace 4 min" },
  { who: "u1", action: "comentó en", obj: "T-118", when: "hace 18 min", preview: "Ya encontré 3 referencias sólidas, sigo mañana con la matriz." },
  { who: "u2", action: "reportó bloqueo en", obj: "T-128", when: "hace 42 min", preview: "Espero credenciales de staging de DevOps." },
  { who: "u5", action: "completó", obj: "Reporte semanal", when: "hace 1 h" },
  { who: "u4", action: "escribió bitácora", obj: "Mar 22 abr", when: "hace 2 h" },
  { who: "u3", action: "subió entregable a", obj: "T-112", when: "hace 3 h" },
];

const BITACORA = [
  {
    day: "Mar 22 abr 2026", mood: 4,
    done: [
      "Maqueté la sección de KPIs del dashboard ejecutivo (80%).",
      "Sincronicé con Lucía para alinear el tono de la copy.",
      "Revisé componentes del design system en Figma.",
    ],
    next: [
      "Terminar estados vacíos del dashboard.",
      "Preparar prototipo navegable para review del jueves.",
    ],
    blockers: [],
    hours: 7.5,
  },
  {
    day: "Lun 21 abr 2026", mood: 3,
    done: [
      "Research de 6 competidores — notas en Notion.",
      "Primera iteración de la tarjeta de evaluación.",
    ],
    next: ["Consolidar hallazgos en una matriz.", "Discutir con el equipo."],
    blockers: ["Falta acceso al tablero de analytics — pedí ayer."],
    hours: 6.0,
  },
  {
    day: "Vie 18 abr 2026", mood: 5,
    done: ["Cerré sprint 11 con 100%.", "Documenté el flujo de onboarding v2.", "1:1 con Sofía — muy buena retro."],
    next: ["Arrancar sprint 12 el lunes."],
    blockers: [],
    hours: 8.0,
  },
];

const ONBOARDING = [
  { group: "Documentación", items: [
    { t: "Firmar contrato de prácticas", done: true,  who: "RH" },
    { t: "Subir constancia de estudios", done: true,  who: "Practicante" },
    { t: "Política de confidencialidad",  done: true,  who: "Practicante" },
    { t: "Formulario de datos bancarios", done: false, who: "Practicante", due: "Vie 24 abr" },
  ]},
  { group: "Accesos y herramientas", items: [
    { t: "Cuenta corporativa @mentorly",  done: true,  who: "IT" },
    { t: "Slack + canales del equipo",    done: true,  who: "IT" },
    { t: "Acceso a Figma y repo GitHub",  done: false, who: "IT", due: "Hoy" },
    { t: "VPN y credenciales staging",    done: false, who: "IT" },
  ]},
  { group: "Mentoría y equipo", items: [
    { t: "Asignar mentor",                done: true,  who: "Líder" },
    { t: "Reunión de kickoff con equipo", done: true,  who: "Líder" },
    { t: "Definir objetivos de 30 días",  done: false, who: "Mentor", due: "Lun 27 abr" },
    { t: "Calendario 1:1 recurrente",     done: false, who: "Mentor" },
  ]},
  { group: "Capacitaciones", items: [
    { t: "Curso: Cultura Mentorly (30 min)", done: true,  who: "Practicante" },
    { t: "Curso: Seguridad y datos",         done: false, who: "Practicante", due: "Jue 30 abr" },
    { t: "Curso: Metodología de trabajo",    done: false, who: "Practicante" },
  ]},
];

const KPI_SCORES = [
  { k: "Cumplimiento de tareas",   v: 92, d: +4, target: 90 },
  { k: "Calidad de entregables",   v: 86, d: +2, target: 85 },
  { k: "Proactividad",             v: 78, d: -1, target: 80 },
  { k: "Comunicación",             v: 88, d: +6, target: 80 },
  { k: "Aprendizaje continuo",     v: 74, d: +3, target: 75 },
];

window.mentorlyData = { INTERNS, TASKS, STATUSES, ACTIVITY, BITACORA, ONBOARDING, KPI_SCORES };
