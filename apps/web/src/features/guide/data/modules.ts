import type { IconName } from '@/components/ui/icon'
import type { MembershipRole } from '@/types/api'

export interface FlowStep {
  /** Label corto del paso (≤ 5 palabras). */
  label: string
  /** Quién hace este paso (rol primario). */
  actor: MembershipRole | 'system' | 'any'
  /** Detalle ampliado opcional para hover/tooltip. */
  hint?: string
}

export interface UseCase {
  title: string
  description: string
}

export interface GuideModule {
  /** Slug en URL (ej. 'evaluaciones'). */
  slug: string
  /** Nombre humano. */
  name: string
  /** Icono del sidebar. */
  icon: IconName
  /** Ruta real del módulo en la app. */
  appPath: string
  /** Resumen de 1-2 frases. */
  summary: string
  /** Roles que típicamente usan este módulo (no exhaustivo, los principales). */
  roles: MembershipRole[]
  /** Flujo paso a paso. 4-7 pasos idealmente. */
  flow: FlowStep[]
  /** Cuándo usarlo — escenarios concretos. */
  useCases: UseCase[]
  /** Buenos hábitos / errores a evitar. */
  tips: string[]
  /** Color de acento para el hero card. */
  accent: 'amber' | 'sky' | 'rose' | 'violet' | 'emerald' | 'lime' | 'orange'
}

export const GUIDE_MODULES: GuideModule[] = [
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'inicio',
    name: 'Inicio',
    icon: 'Home',
    appPath: '/dashboard',
    accent: 'sky',
    summary:
      'Tu punto de partida diario. Concentra alertas, tareas próximas a vencer, equipo activo y métricas operativas del día.',
    roles: ['tenant_admin', 'hr', 'team_lead', 'mentor', 'supervisor', 'intern'],
    flow: [
      { label: 'Iniciás sesión', actor: 'any' },
      { label: 'Sistema agrega tu día', actor: 'system', hint: 'Tareas vencidas, bitácoras pendientes, evaluaciones por revisar, notificaciones sin leer.' },
      { label: 'Revisás bloqueadores', actor: 'any', hint: 'Las tarjetas rojas son lo que te frena hoy.' },
      { label: 'Saltás al módulo correspondiente', actor: 'any', hint: 'Click en una tarjeta abre la entidad relacionada.' },
    ],
    useCases: [
      { title: 'Inicio del día', description: 'Identificás en 30 segundos qué exige atención inmediata sin tener que recorrer cada módulo.' },
      { title: 'Standup express', description: 'Lo que ves en tu dashboard es prácticamente tu agenda del día — basta para reportar en el daily.' },
    ],
    tips: [
      'Si una tarjeta te aparece todos los días, probablemente conviene crear una automatización para auto‑resolverla.',
      'Los practicantes ven `/mi-dia` en lugar de `/dashboard` — versión simplificada con foco en tareas + bitácora.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'tareas',
    name: 'Tareas',
    icon: 'Tasks',
    appPath: '/tareas',
    accent: 'violet',
    summary:
      'El backlog operativo del workspace. Tareas con responsable, fechas, prioridad, tags y vínculos a proyectos u objetivos (KR).',
    roles: ['tenant_admin', 'hr', 'team_lead', 'mentor', 'intern'],
    flow: [
      { label: 'Líder crea la tarea', actor: 'team_lead', hint: 'Desde "Nueva tarea" o vía Coach IA con un prompt natural.' },
      { label: 'Asigna 1+ responsables', actor: 'team_lead', hint: 'Mentor / practicante / staff.' },
      { label: 'Vincula a proyecto o KR', actor: 'team_lead', hint: 'Opcional. Si se vincula a KR, el progreso se autocalcula al cerrar tareas.' },
      { label: 'Responsable trabaja', actor: 'intern', hint: 'Puede iniciar timer (time tracking), añadir comentarios, subir attachments.' },
      { label: 'Marca como DONE', actor: 'intern', hint: 'Dispara eventos de gamification y recompute de KR.' },
      { label: 'Líder revisa y cierra', actor: 'team_lead' },
    ],
    useCases: [
      { title: 'Reparto semanal de carga', description: 'El líder crea las tareas del sprint y las asigna por capacidad/seniority.' },
      { title: 'Pedido ad-hoc del mentor', description: 'Mentor pide al practicante "investigá X y deja notas" como tarea con due date corta.' },
      { title: 'Auto-asignación', description: 'El practicante crea una tarea suya para no olvidarse de algo (`assigned_to=self`).' },
    ],
    tips: [
      'Usá tags para clasificar por área/cliente — facilita reportes posteriores.',
      'Cargar `estimated_minutes` ayuda a calibrar planning futuro contra el `actual_minutes` que el timer mide.',
      'Si tu KR depende de tareas, vinculá: el porcentaje del KR se sincroniza solo cuando completás cada una.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'proyectos',
    name: 'Proyectos',
    icon: 'Panel',
    appPath: '/proyectos',
    accent: 'orange',
    summary:
      'Agrupador de tareas con equipo, fechas de inicio/fin, estado y vista kanban. Útil cuando varias tareas comparten objetivo o cliente.',
    roles: ['tenant_admin', 'hr', 'team_lead', 'mentor'],
    flow: [
      { label: 'Líder crea proyecto', actor: 'team_lead', hint: 'Nombre, equipo, fechas, prioridad.' },
      { label: 'Define equipo', actor: 'team_lead', hint: 'Membresía dentro del proyecto: practicantes + mentor.' },
      { label: 'Carga tareas dentro', actor: 'team_lead' },
      { label: 'Equipo ejecuta', actor: 'intern', hint: 'Cada uno trabaja sus tareas, comentarios y attachments quedan vinculados al proyecto.' },
      { label: 'Líder cierra proyecto', actor: 'team_lead', hint: 'Estado COMPLETED dispara badge "Primer proyecto cerrado" para el equipo.' },
    ],
    useCases: [
      { title: 'Proyecto cliente Q3', description: 'Equipo de 3 con mentor responsable, ~40 tareas que ejecutan durante 8 semanas.' },
      { title: 'Iniciativa interna', description: 'Migrar a un nuevo CRM — proyecto con tareas + KR vinculado.' },
    ],
    tips: [
      'No abuses de proyectos para cosas pequeñas. Si son 2-3 tareas relacionadas, basta con un tag compartido.',
      'El estado del proyecto NO se calcula desde tareas — lo decide el líder explícitamente.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'bitacora',
    name: 'Bitácora',
    icon: 'Log',
    appPath: '/reportes-diarios',
    accent: 'amber',
    summary:
      'Registro diario de avances del practicante. Una entrada por día con qué hizo, qué bloquea, estado emocional y horas trabajadas. Es el insumo principal para evaluaciones y reportes universitarios.',
    roles: ['intern', 'mentor', 'tenant_admin', 'hr'],
    flow: [
      { label: 'Practicante escribe entrada', actor: 'intern', hint: 'Texto libre + horas + estado emocional + bloqueadores (opcional).' },
      { label: 'Submit dispara IA', actor: 'system', hint: 'El módulo IA genera un resumen ejecutivo del día (`ai_summaries`).' },
      { label: 'Mentor recibe notificación', actor: 'system', hint: 'In-app + email si configurado.' },
      { label: 'Mentor lee y comenta', actor: 'mentor', hint: 'Puede dejar feedback inline o pedir ampliación.' },
      { label: 'HR/Admin agregan a reporte', actor: 'hr', hint: 'Las entradas alimentan automáticamente los reportes universidad.' },
    ],
    useCases: [
      { title: 'Cierre de día estándar', description: 'Practicante reporta al final del día: avances, bloqueadores, horas. 2-3 min.' },
      { title: 'Bloqueador urgente', description: 'Practicante marca `is_blocker=true` → mentor recibe notificación inmediata con prioridad alta.' },
      { title: 'Reporte universidad', description: 'HR genera el reporte mensual; las bitácoras alimentan la sección de actividades.' },
    ],
    tips: [
      'Configurá recordatorio diario 17:00 — sin hábito, las bitácoras se olvidan.',
      'Las horas trabajadas se suman automáticamente al `hours_completed` del practicante.',
      'El estado emocional ayuda a detectar burnout antes que sea un problema — revisálo en la analítica.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'mentoria',
    name: 'Mentoría',
    icon: 'Mentor',
    appPath: '/mentoria',
    accent: 'rose',
    summary:
      'Relación 1:1 mentor ↔ practicante. Sesiones agendadas, notas privadas del mentor, metas de crecimiento y skills tracker.',
    roles: ['mentor', 'tenant_admin', 'hr'],
    flow: [
      { label: 'HR asigna mentor a practicante', actor: 'hr', hint: 'Crea `mentor_assignment` con fechas de vigencia.' },
      { label: 'Mentor agenda sesión', actor: 'mentor', hint: 'Recurrente o ad-hoc, integra con Google Calendar opcional.' },
      { label: 'Sesión ocurre', actor: 'mentor' },
      { label: 'Mentor escribe notas', actor: 'mentor', hint: 'Pueden ser privadas (sólo él) o compartidas con el practicante.' },
      { label: 'Define metas de crecimiento', actor: 'mentor', hint: 'Skills + nivel objetivo, se trackean en `growth_goals`.' },
      { label: 'Practicante ve plan y feedback compartido', actor: 'intern' },
    ],
    useCases: [
      { title: 'Onboarding del practicante', description: 'Primera semana: mentor asignado agenda 3 sesiones iniciales.' },
      { title: 'Plan de crecimiento Q4', description: 'Mentor define 3 skills a desarrollar con metas medibles y revisa cada 2 semanas.' },
      { title: 'Feedback continuo', description: 'Tras cada sesión, notas con recomendaciones — el practicante las ve en su dashboard.' },
    ],
    tips: [
      'Las notas privadas son sólo para el mentor — el practicante NO las ve. Usalas para observaciones que aún no querés compartir.',
      'Asigná un solo mentor activo por practicante. Múltiples mentores se permite, pero genera ambigüedad.',
      'Skills sin nivel objetivo no se trackean — siempre poné `target_level`.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'evaluaciones',
    name: 'Evaluaciones',
    icon: 'Eval',
    appPath: '/evaluaciones',
    accent: 'sky',
    summary:
      'Evaluaciones formales de desempeño basadas en scorecards. Ciclo: programar → llenar → enviar → aceptar (o disputar). Generan score global + narrative.',
    roles: ['tenant_admin', 'hr', 'team_lead', 'mentor'],
    flow: [
      { label: 'Admin/HR crea scorecard', actor: 'hr', hint: 'Plantilla reutilizable con métricas. En /configuracion/scorecards.' },
      { label: 'Manager programa evaluación', actor: 'team_lead', hint: 'Asigna subject, evaluator, kind (30/60/90d, ad-hoc, 360°), fecha.' },
      { label: 'Evaluador llena respuestas', actor: 'mentor', hint: 'Califica cada métrica + narrativa libre. Borrador autosave.' },
      { label: 'Evaluador envía', actor: 'mentor', hint: 'Status → SUBMITTED. Ya no se puede editar.' },
      { label: 'Subject ve resultado', actor: 'intern' },
      { label: 'Subject acepta o disputa', actor: 'intern', hint: 'Si acepta → ACKNOWLEDGED (final). Si disputa → DISPUTED y HR debe resolver.' },
    ],
    useCases: [
      { title: 'Eval 30/60/90 días', description: 'Hito formal del programa de prácticas. HR programa al ingreso del practicante.' },
      { title: 'Ad-hoc post-proyecto', description: 'Mentor solicita evaluación puntual al cerrar un proyecto difícil.' },
      { title: '360° feedback', description: 'Varias evaluaciones con mismo subject y distintos evaluators (líder, pares, subordinados).' },
    ],
    tips: [
      'Las scorecards son plantillas — creá una vez "Practicante 90 días" y reutilizala en todas las eval 90d.',
      'Si el subject disputa, sólo Admin/HR puede resolver (TeamLead no, podría ser conflicto de interés).',
      'El borrador autosave guarda cada cambio — podés cerrar y volver sin perder progreso.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'okrs',
    name: 'OKRs',
    icon: 'Flag',
    appPath: '/okrs',
    accent: 'emerald',
    summary:
      'Objetivos y Key Results trimestrales por persona, equipo o empresa. Los KRs se cumplen via tareas vinculadas o check-ins manuales.',
    roles: ['tenant_admin', 'hr', 'team_lead', 'intern'],
    flow: [
      { label: 'Admin define objetivos empresa', actor: 'tenant_admin', hint: 'Top-level objectives del trimestre.' },
      { label: 'Líder define objetivos equipo', actor: 'team_lead', hint: 'Cascadean del nivel empresa, alineados a él.' },
      { label: 'Cada KR tiene métrica medible', actor: 'team_lead', hint: 'Tipo: increase/decrease/boolean/percentage.' },
      { label: 'Tareas se vinculan a KRs', actor: 'team_lead', hint: 'Auto-progress: al cerrar tareas, el % del KR sube.' },
      { label: 'Check-ins semanales', actor: 'any', hint: 'Actualización manual + comentario contextual.' },
      { label: 'Cierre de trimestre', actor: 'team_lead', hint: 'Status final FINISHED + retro.' },
    ],
    useCases: [
      { title: 'OKR de empresa Q4', description: 'Admin: "Aumentar retention >85%" con 3 KRs medibles.' },
      { title: 'OKR personal practicante', description: 'Intern: "Dominar TypeScript" con KRs basados en proyectos y evaluaciones.' },
      { title: 'OKR de equipo', description: 'Squad mobile: "Lanzar app v2" con KRs de features y métricas de adoption.' },
    ],
    tips: [
      'Máximo 3-5 KRs por objetivo. Más es ruido, menos no mide nada.',
      'Vincular tareas a KRs te ahorra check-ins manuales — el progreso se autocalcula.',
      'Hacé check-ins cada lunes — no esperés al cierre para descubrir que no llegabas.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'analitica',
    name: 'Analítica',
    icon: 'Analytics',
    appPath: '/analitica',
    accent: 'violet',
    summary:
      'Dashboards agregados del workspace: throughput de tareas, horas trabajadas por equipo, estado emocional promedio, evolución de evaluaciones, cumplimiento de OKRs.',
    roles: ['tenant_admin', 'hr', 'team_lead', 'supervisor', 'mentor'],
    flow: [
      { label: 'Sistema agrega datos cada noche', actor: 'system', hint: 'KPI snapshots, daily aggregates.' },
      { label: 'Admin/Lead abre /analitica', actor: 'team_lead' },
      { label: 'Filtra por equipo/período', actor: 'team_lead' },
      { label: 'Identifica tendencias', actor: 'team_lead', hint: 'Burnout, bottlenecks, top performers.' },
      { label: 'Toma decisiones', actor: 'team_lead', hint: 'Redistribución de carga, intervención de RR.HH., etc.' },
    ],
    useCases: [
      { title: 'Reunión mensual de RR.HH.', description: 'Reviewar estado emocional promedio + horas + completion rate de bitácoras.' },
      { title: 'Detectar burnout', description: 'Estado emocional < 6/10 por 2+ semanas en alguien → alerta.' },
      { title: 'Benchmark equipos', description: 'Comparar throughput entre equipos para detectar diferencias estructurales.' },
    ],
    tips: [
      'Los datos son del día anterior (snapshots nocturnos). Si necesitás real-time, mirá el dashboard de Inicio.',
      'Los gráficos exportan a PNG con click derecho — útil para reportes mensuales.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'onboarding',
    name: 'Onboarding',
    icon: 'Onboard',
    appPath: '/onboarding',
    accent: 'lime',
    summary:
      'Checklist de pasos que cada practicante completa al ingresar. Items configurables por tenant (RR.HH., TI, equipo, mentor). Visible al practicante con progreso.',
    roles: ['hr', 'intern', 'tenant_admin'],
    flow: [
      { label: 'Admin/HR configura plantilla', actor: 'hr', hint: 'En /configuracion/onboarding-plantilla. Pasos agrupados por responsable.' },
      { label: 'Practicante es invitado', actor: 'hr' },
      { label: 'Sistema crea items por defecto', actor: 'system', hint: 'Copia la plantilla a items personales (`onboarding_items`).' },
      { label: 'Cada responsable marca su parte', actor: 'any', hint: 'RR.HH. completa contratos, TI da accesos, mentor agenda primera sesión.' },
      { label: 'Practicante ve su progreso', actor: 'intern', hint: 'Barra de % completado. Items pendientes con responsable y deadline.' },
      { label: 'Checklist completo', actor: 'system', hint: 'Dispara evento, otorga badge "Onboarding completo".' },
    ],
    useCases: [
      { title: 'Llega un practicante nuevo', description: 'HR lo invita → checklist se crea automáticamente con la plantilla → cada área va completando.' },
      { title: 'Actualizar plantilla', description: 'Ajustás los pasos en /configuracion → afecta a los próximos onboardings (no a los que ya empezaron).' },
    ],
    tips: [
      'Mantené pasos cortos y específicos. "Agendar reunión con mentor" es mejor que "Conocer al equipo".',
      'Asignar responsable a cada paso. Sin owner, los pasos se quedan colgados.',
      'Si tu tenant es nuevo, el sistema trae un template default — podés clonarlo y editarlo.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'logros',
    name: 'Logros',
    icon: 'Eval',
    appPath: '/logros',
    accent: 'amber',
    summary:
      'Sistema de gamification: badges otorgadas automáticamente al cumplir hitos. Puntos acumulables. Leaderboard del workspace. Motiva consistencia sin requerir gestión manual.',
    roles: ['intern', 'mentor', 'team_lead', 'tenant_admin', 'hr'],
    flow: [
      { label: 'Usuario realiza acción', actor: 'any', hint: 'Enviar bitácora, cerrar tarea, completar evaluación, etc.' },
      { label: 'Listener evalúa criterios', actor: 'system', hint: 'Por ejemplo: 7 bitácoras seguidas → badge "Consistencia".' },
      { label: 'Sistema otorga badge + puntos', actor: 'system', hint: 'Confetti + toast en la UI.' },
      { label: 'Usuario ve en /logros', actor: 'any', hint: 'Badges desbloqueadas, puntos totales, ranking.' },
    ],
    useCases: [
      { title: 'Reconocimiento de consistencia', description: 'Practicante que entrega bitácora 30 días seguidos recibe badge "Disciplinado".' },
      { title: 'Cierre de primer proyecto', description: 'Todo el equipo del proyecto recibe badge cuando se marca COMPLETED.' },
      { title: 'Mentor del trimestre', description: 'Auto-otorgado al mentor con mejor feedback en evaluaciones del Q.' },
    ],
    tips: [
      'Los criterios de badges son fijos por ahora — no se configuran desde UI. Si querés sumar uno nuevo, contactá soporte.',
      'No mostrar el ranking puede ser saludable en culturas no-competitivas. Está configurable en /configuracion/empresa.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'personas',
    name: 'Personas',
    icon: 'People',
    appPath: '/practicantes',
    accent: 'sky',
    summary:
      'Roster completo de practicantes con su perfil: programa universitario, horas completadas/objetivo, mentor asignado, estado emocional promedio, evaluaciones, logros.',
    roles: ['tenant_admin', 'hr', 'team_lead'],
    flow: [
      { label: 'HR ve roster', actor: 'hr', hint: 'Filtros por estado, programa, mentor.' },
      { label: 'Click en una persona', actor: 'hr' },
      { label: 'Ve perfil completo', actor: 'hr', hint: 'Tabs: info, bitácoras, tareas, evaluaciones, mentoría, logros.' },
      { label: 'Acciones rápidas', actor: 'hr', hint: 'Asignar mentor, ver bitácoras, programar evaluación.' },
    ],
    useCases: [
      { title: 'Onboarding administrativo', description: 'HR captura datos del practicante: universidad, programa, supervisor universitario.' },
      { title: 'Track de horas', description: 'HR monitorea hours_completed vs hours_target (típicamente 240-480 según programa).' },
      { title: 'Cierre de práctica', description: 'Al llegar al target, HR cambia estado a "Egresado" y genera reporte universidad.' },
    ],
    tips: [
      'Mantener actualizado el supervisor universitario — facilita los reportes mensuales.',
      'El estado "en pausa" preserva las horas acumuladas pero detiene el contador automático.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'automatizacion',
    name: 'Automatización',
    icon: 'Auto',
    appPath: '/automatizacion',
    accent: 'orange',
    summary:
      'Reglas if-this-then-that aplicadas a eventos del workspace. Por ejemplo: "Si bitácora marca bloqueador → notificar a mentor + crear tarea de seguimiento".',
    roles: ['tenant_admin', 'hr'],
    flow: [
      { label: 'Admin crea regla', actor: 'tenant_admin', hint: 'Trigger (evento) + Condición (filtro) + Acción (qué hacer).' },
      { label: 'Sistema escucha eventos', actor: 'system' },
      { label: 'Match dispara la acción', actor: 'system', hint: 'Notificar, crear tarea, enviar email, llamar webhook externo.' },
      { label: 'Run queda en log', actor: 'system', hint: 'Tabla `automation_runs` con éxito/fallo y duración.' },
    ],
    useCases: [
      { title: 'Alerta bloqueador crítico', description: 'Bitácora con bloqueador → email al mentor + crear tarea para HR.' },
      { title: 'Reminder de evaluación', description: '7 días antes del cierre del 90d → notificación al mentor asignado.' },
      { title: 'Sync con tools externos', description: 'Tarea cerrada → POST a webhook que crea registro en Jira/Asana.' },
    ],
    tips: [
      'Empezá con 2-3 reglas. Muchas reglas activas vuelven impredecible el comportamiento.',
      'Mirá `automation_runs` periódicamente para detectar reglas que están fallando silenciosamente.',
      'Las acciones de webhook esperan respuesta HTTP 2xx — si el endpoint externo es lento se demora todo el run.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'coach-ia',
    name: 'Coach IA',
    icon: 'Sparkles',
    appPath: '/ia',
    accent: 'violet',
    summary:
      'Asistente conversacional con contexto de tu workspace. Generar resúmenes, redactar feedback, sugerir tareas, analizar tendencias. Usa Claude por debajo.',
    roles: ['tenant_admin', 'hr', 'team_lead', 'mentor', 'intern'],
    flow: [
      { label: 'Usuario abre chat', actor: 'any' },
      { label: 'Escribe pregunta natural', actor: 'any', hint: 'Ej. "Resumime las bitácoras de Juan esta semana".' },
      { label: 'IA recupera contexto del tenant', actor: 'system', hint: 'Embeddings + queries filtradas por permisos del usuario.' },
      { label: 'Responde con datos reales', actor: 'system', hint: 'Citaciones a la fuente cuando aplica.' },
    ],
    useCases: [
      { title: 'Redactar narrativa de evaluación', description: '"Generá un borrador de feedback para María basado en sus últimas bitácoras y su desempeño en tareas".' },
      { title: 'Detectar patrones', description: '"¿Qué practicantes han reportado más bloqueadores este mes?"' },
      { title: 'Ayuda contextual', description: '"¿Cómo creo una scorecard 360°?" — responde con pasos específicos del flujo.' },
    ],
    tips: [
      'La IA respeta tu nivel de permisos — sólo ve datos a los que tu rol tiene acceso.',
      'Las respuestas son sugerencias, no decisiones. Siempre revisá narrativas autogeneradas antes de enviar evaluaciones.',
      'Si la respuesta es genérica, agregá más contexto en el prompt — el módulo no adivina lo que estás buscando.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    slug: 'reportes',
    name: 'Reportes',
    icon: 'Download',
    appPath: '/reportes',
    accent: 'emerald',
    summary:
      'Reportes formales exportables a PDF/Excel: reporte universidad (mensual del practicante), reportes ejecutivos, reportes por equipo. Templates configurables.',
    roles: ['tenant_admin', 'hr', 'team_lead'],
    flow: [
      { label: 'Admin/HR elige template', actor: 'hr', hint: 'Universidad, ejecutivo, equipo, practicante, custom.' },
      { label: 'Define parámetros', actor: 'hr', hint: 'Período, scope (practicante/equipo/empresa), formato.' },
      { label: 'Solicita generación', actor: 'hr' },
      { label: 'Sistema agrega datos', actor: 'system', hint: 'Queda en `report_runs` mientras se procesa.' },
      { label: 'Notifica con link de descarga', actor: 'system', hint: 'Link expira en X días.' },
      { label: 'HR envía a destinatario', actor: 'hr', hint: 'Universidad, exec, etc.' },
    ],
    useCases: [
      { title: 'Reporte mensual universidad', description: 'Generar el reporte oficial con horas, actividades y firma de supervisor.' },
      { title: 'Review trimestral ejecutivo', description: 'Reporte agregado del trimestre para C-level.' },
      { title: 'Cierre de práctica', description: 'Al egresar un practicante, generar reporte final con todo el historial.' },
    ],
    tips: [
      'Los templates se configuran desde el backend. Si querés un layout custom, contactá soporte.',
      'Los reportes generados quedan en historial — no hace falta regenerar el mismo del mes pasado.',
      'El reporte universidad incluye firma digital del supervisor universitario si lo tenés cargado.',
    ],
  },
]

export const GUIDE_MODULE_BY_SLUG: Record<string, GuideModule> = Object.fromEntries(
  GUIDE_MODULES.map((m) => [m.slug, m]),
)
