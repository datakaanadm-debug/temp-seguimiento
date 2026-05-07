import type { MembershipRole } from '@/types/api'

/**
 * Step de tour. `route` indica la ruta donde debe estar el usuario para que
 * el selector exista. `element` es CSS selector que apunta al elemento real
 * de la UI a resaltar (preferimos `[data-tour="..."]` para no acoplar a CSS).
 *
 * Si `element` es null, el step se muestra centrado sin highlight (intro/cierre).
 */
export interface TourStep {
  route?: string
  element: string | null
  popover: {
    title: string
    description: string
    side?: 'top' | 'bottom' | 'left' | 'right' | 'over'
    align?: 'start' | 'center' | 'end'
  }
}

const COMMON_INTRO: TourStep = {
  element: null,
  popover: {
    title: '👋 Bienvenido a Interna',
    description:
      'Te voy a mostrar lo esencial en 1 minuto. Puedes saltar el tour cuando quieras.',
  },
}

const COMMON_OUTRO: TourStep = {
  element: '[data-tour="ai-coach-fab"]',
  popover: {
    title: '🤖 Tu copiloto IA',
    description:
      'Cualquier duda, abre el coach IA flotante. Puede resumir tu día, sugerir prioridades y responder preguntas.',
    side: 'left',
    align: 'end',
  },
}

const TOURS: Record<MembershipRole, TourStep[]> = {
  intern: [
    COMMON_INTRO,
    {
      route: '/mi-dia',
      element: '[data-tour="sidebar-mi-dia"]',
      popover: {
        title: 'Tu día, en un vistazo',
        description:
          'Acá ves agenda, tareas activas y avances de la semana. Es tu pantalla principal.',
        side: 'right',
      },
    },
    {
      route: '/reportes-diarios/hoy',
      element: '[data-tour="sidebar-bitacora"]',
      popover: {
        title: 'Reporta tu día',
        description:
          'Cada día dedica 60 segundos a documentar avances, próximos pasos y bloqueos. Tu líder y mentor lo ven en tiempo real.',
        side: 'right',
      },
    },
    {
      route: '/tareas',
      element: '[data-tour="sidebar-tareas"]',
      popover: {
        title: 'Tus tareas',
        description:
          'Mueve cards entre columnas para cambiar de estado. Filtra por estado, prioridad o asignado.',
        side: 'right',
      },
    },
    {
      route: '/mentoria',
      element: '[data-tour="sidebar-mentoria"]',
      popover: {
        title: 'Tu mentor',
        description:
          'Aquí ves próximas sesiones 1:1, notas compartidas y tu growth path con objetivos del trimestre.',
        side: 'right',
      },
    },
    {
      route: '/onboarding',
      element: '[data-tour="sidebar-onboarding"]',
      popover: {
        title: 'Checklist de ingreso',
        description:
          'Tus tareas administrativas: contrato, NDA, accesos. Algunas requieren que subas documentos directo aquí.',
        side: 'right',
      },
    },
    {
      route: '/logros',
      element: '[data-tour="sidebar-logros"]',
      popover: {
        title: 'Tus logros',
        description:
          'Ganas puntos y badges por reportar al día, completar OKRs y ayudar a tu equipo. Compite sano con tus compañeros.',
        side: 'right',
      },
    },
    COMMON_OUTRO,
  ],

  mentor: [
    COMMON_INTRO,
    {
      route: '/dashboard',
      element: '[data-tour="sidebar-mi-dia"]',
      popover: {
        title: 'Tu inicio',
        description:
          'Resumen del estado de tus mentees: alertas, tareas en revisión y métricas semanales.',
        side: 'right',
      },
    },
    {
      route: '/mentoria',
      element: '[data-tour="sidebar-mentoria"]',
      popover: {
        title: 'Tus 1:1s',
        description:
          'Lista de tus practicantes asignados. Selecciona uno para ver historial, sesiones, notas privadas y growth path.',
        side: 'right',
      },
    },
    {
      route: '/tareas',
      element: '[data-tour="sidebar-tareas"]',
      popover: {
        title: 'Tareas que revisas',
        description:
          'Las tareas donde eres asignado, revisor o donde tus mentees trabajan. Comenta y aprueba aquí.',
        side: 'right',
      },
    },
    {
      route: '/evaluaciones',
      element: '[data-tour="sidebar-evaluaciones"]',
      popover: {
        title: 'Evaluaciones',
        description:
          'Llena los scorecards de tus practicantes. La IA puede generar el borrador de la narrativa.',
        side: 'right',
      },
    },
    COMMON_OUTRO,
  ],

  team_lead: [
    COMMON_INTRO,
    {
      route: '/dashboard',
      element: '[data-tour="sidebar-mi-dia"]',
      popover: {
        title: 'Dashboard del equipo',
        description:
          'Visión global: tareas activas, bloqueos del equipo, evaluaciones próximas, asignaciones.',
        side: 'right',
      },
    },
    {
      route: '/proyectos',
      element: '[data-tour="sidebar-proyectos"]',
      popover: {
        title: 'Proyectos',
        description:
          'Todos los proyectos del equipo. Clickea uno para ver su tablero Kanban.',
        side: 'right',
      },
    },
    {
      route: '/tareas',
      element: '[data-tour="sidebar-tareas"]',
      popover: {
        title: 'Tareas del workspace',
        description:
          'Arrastra cards entre columnas. Como líder ves todas las tareas y puedes editarlas.',
        side: 'right',
      },
    },
    {
      route: '/practicantes',
      element: '[data-tour="sidebar-practicantes"]',
      popover: {
        title: 'Tu gente',
        description:
          'Aquí invitas a nuevas personas. Asignas mentores, ves perfiles, y editas datos.',
        side: 'right',
      },
    },
    {
      route: '/evaluaciones',
      element: '[data-tour="sidebar-evaluaciones"]',
      popover: {
        title: 'Evaluaciones',
        description:
          'Crea evaluaciones 30/60/90 días para tu equipo. Define scorecards y métricas.',
        side: 'right',
      },
    },
    {
      route: '/analitica',
      element: '[data-tour="sidebar-analitica"]',
      popover: {
        title: 'Analítica',
        description:
          'KPIs del equipo: cumplimiento, horas, bloqueos. Identifica patrones de riesgo a tiempo.',
        side: 'right',
      },
    },
    COMMON_OUTRO,
  ],

  hr: [
    COMMON_INTRO,
    {
      route: '/dashboard',
      element: '[data-tour="sidebar-mi-dia"]',
      popover: {
        title: 'Vista RRHH',
        description:
          'Estado del programa de prácticas: en riesgo, evaluaciones pendientes, onboardings activos.',
        side: 'right',
      },
    },
    {
      route: '/practicantes',
      element: '[data-tour="sidebar-practicantes"]',
      popover: {
        title: 'Personas',
        description:
          'Invita practicantes y mentores, gestiona perfiles, asigna mentores. Filtra por rol.',
        side: 'right',
      },
    },
    {
      route: '/automatizacion',
      element: '[data-tour="sidebar-automatizacion"]',
      popover: {
        title: 'Automatizaciones',
        description:
          'Reglas que se ejecutan solas: alertar bloqueos, escalar tareas vencidas, generar resúmenes IA semanales.',
        side: 'right',
      },
    },
    {
      route: '/configuracion/onboarding-plantilla',
      element: null,
      popover: {
        title: 'Plantilla de onboarding',
        description:
          'Aquí personalizas los pasos del checklist que reciben los nuevos practicantes al aceptar invitación. Edita títulos, fechas y responsables.',
      },
    },
    COMMON_OUTRO,
  ],

  tenant_admin: [
    COMMON_INTRO,
    {
      route: '/dashboard',
      element: '[data-tour="sidebar-mi-dia"]',
      popover: {
        title: 'Tu dashboard',
        description:
          'Visión ejecutiva del workspace: KPIs, tareas activas, alertas IA.',
        side: 'right',
      },
    },
    {
      route: '/practicantes',
      element: '[data-tour="sidebar-practicantes"]',
      popover: {
        title: 'Personas',
        description:
          'Invita usuarios de cualquier rol (admin, RH, líder, mentor, practicante).',
        side: 'right',
      },
    },
    {
      route: '/configuracion/empresa',
      element: null,
      popover: {
        title: 'Configura tu empresa',
        description:
          'Logo, branding, residencia de datos. Y en "Plantilla de onboarding" personalizas qué ven los nuevos practicantes.',
      },
    },
    {
      route: '/configuracion/equipo',
      element: null,
      popover: {
        title: 'Estructura organizacional',
        description:
          'Crea departamentos, áreas y equipos. Asigna miembros con roles (líder, mentor, practicante, observador).',
      },
    },
    {
      route: '/automatizacion',
      element: '[data-tour="sidebar-automatizacion"]',
      popover: {
        title: 'Automatizaciones',
        description:
          'Reglas que se ejecutan solas. Crea desde plantillas o personalizadas.',
        side: 'right',
      },
    },
    COMMON_OUTRO,
  ],

  // supervisor + viewer: tour mínimo
  supervisor: [
    COMMON_INTRO,
    {
      route: '/dashboard',
      element: '[data-tour="sidebar-mi-dia"]',
      popover: {
        title: 'Modo lectura',
        description:
          'Como supervisor, tienes acceso a dashboards y reportes pero no puedes editar.',
        side: 'right',
      },
    },
    {
      route: '/analitica',
      element: '[data-tour="sidebar-analitica"]',
      popover: {
        title: 'Analítica',
        description:
          'Métricas del programa, KPIs por equipo y tendencias.',
        side: 'right',
      },
    },
    COMMON_OUTRO,
  ],
  viewer: [
    COMMON_INTRO,
    COMMON_OUTRO,
  ],
}

export function getTourForRole(role: MembershipRole | null | undefined): TourStep[] {
  if (!role) return []
  return TOURS[role] ?? []
}
