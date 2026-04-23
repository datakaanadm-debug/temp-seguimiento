'use client'

import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'

type Role = {
  id: string
  name: string
  description: string
  members: number
  isSystem?: boolean
  accent?: 'terracotta' | 'cobalt' | 'olive' | 'ochre'
}

// Matriz de permisos basada en doc sección 9 (RBAC).
const ROLES: Role[] = [
  { id: 'tenant_admin', name: 'Admin del workspace', description: 'Acceso total: configuración, usuarios, billing, integraciones.', members: 2, isSystem: true, accent: 'cobalt' },
  { id: 'hr', name: 'Recursos Humanos', description: 'Supervisa programa, evalúa, configura automatizaciones.', members: 3, isSystem: true, accent: 'olive' },
  { id: 'team_lead', name: 'Líder de equipo', description: 'Asigna tareas, revisa entregables, evalúa su equipo.', members: 7, isSystem: true, accent: 'terracotta' },
  { id: 'mentor', name: 'Mentor', description: 'Notas 1:1 privadas, seguimiento de crecimiento.', members: 5, isSystem: true, accent: 'ochre' },
  { id: 'intern', name: 'Practicante', description: 'Reporta su día, gestiona sus tareas, recibe feedback.', members: 24, isSystem: true },
  { id: 'supervisor', name: 'Supervisor', description: 'Solo lectura. Dashboards y exportes.', members: 1, isSystem: true },
]

const PERMISSIONS = [
  { cap: 'Invitar usuarios', roles: ['tenant_admin', 'hr', 'team_lead'] },
  { cap: 'Ver todos los practicantes', roles: ['tenant_admin', 'hr'] },
  { cap: 'Crear evaluaciones', roles: ['tenant_admin', 'hr', 'team_lead'] },
  { cap: 'Notas privadas de mentoría', roles: ['mentor'] },
  { cap: 'Crear automatizaciones', roles: ['tenant_admin', 'hr'] },
  { cap: 'Ver analítica global', roles: ['tenant_admin', 'hr'] },
  { cap: 'Reporte universidad', roles: ['tenant_admin', 'hr', 'intern'] },
  { cap: 'Configurar billing', roles: ['tenant_admin'] },
  { cap: 'Ver audit log', roles: ['tenant_admin'] },
]

const ACCENT_COLOR: Record<NonNullable<Role['accent']>, string> = {
  terracotta: '#c8532b',
  cobalt: '#3a5f8a',
  olive: '#5a7a3f',
  ochre: '#b8892a',
}

export default function RolesPage() {
  return (
    <div>
      <SectionTitle
        kicker="Workspace · RBAC"
        title="Roles y permisos"
        sub={`${ROLES.length} roles activos · ${ROLES.reduce((a, r) => a + r.members, 0)} usuarios asignados`}
        right={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2">
            <Icon.Plus size={13} />
            Nuevo rol personalizado
          </button>
        }
      />

      {/* Roles list */}
      <div className="mb-5 grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {ROLES.map((r) => {
          const color = r.accent ? ACCENT_COLOR[r.accent] : 'hsl(var(--ink-3))'
          return (
            <div
              key={r.id}
              className="flex flex-col rounded-lg border border-paper-line bg-paper-raised p-3.5"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="text-[13px] font-semibold text-ink">{r.name}</span>
                {r.isSystem && (
                  <PaperBadge tone="neutral" className="ml-auto !text-[9px]">
                    SISTEMA
                  </PaperBadge>
                )}
              </div>
              <p className="mb-3 flex-1 text-[11.5px] leading-[1.5] text-ink-3">{r.description}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-ink-3">{r.members} miembros</span>
                <button className="rounded-md border border-paper-line bg-paper-surface px-2 py-[3px] text-[11px] text-ink-2 hover:border-paper-line-soft">
                  {r.isSystem ? 'Ver' : 'Editar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Permission matrix */}
      <PaperCard title="Matriz de permisos" right={<span className="text-[11px] text-ink-3">capacidades × roles</span>} noPad>
        <div className="overflow-x-auto">
          <div
            className="grid border-b border-paper-line px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3"
            style={{ gridTemplateColumns: `minmax(240px, 1fr) repeat(${ROLES.length}, minmax(80px, 1fr))` }}
          >
            <span>Capacidad</span>
            {ROLES.map((r) => (
              <span key={r.id} className="text-center">
                {shortName(r.name)}
              </span>
            ))}
          </div>
          {PERMISSIONS.map((perm, i) => (
            <div
              key={i}
              className="grid items-center px-4 py-2.5 text-[12.5px]"
              style={{
                gridTemplateColumns: `minmax(240px, 1fr) repeat(${ROLES.length}, minmax(80px, 1fr))`,
                borderBottom:
                  i < PERMISSIONS.length - 1 ? '1px solid hsl(var(--paper-line-soft))' : undefined,
              }}
            >
              <span className="text-ink">{perm.cap}</span>
              {ROLES.map((r) => (
                <span key={r.id} className="text-center">
                  {perm.roles.includes(r.id) ? (
                    <Icon.Check size={14} className="mx-auto text-success" />
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </PaperCard>
    </div>
  )
}

function shortName(name: string) {
  if (name.length <= 12) return name
  return name.split(' ')[0]
}
