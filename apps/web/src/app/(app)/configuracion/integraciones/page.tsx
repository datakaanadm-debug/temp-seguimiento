'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { useRequireRole } from '@/hooks/use-require-role'
import { cn } from '@/lib/utils'

type Integration = {
  id: string
  name: string
  category: 'comm' | 'calendar' | 'identity' | 'files' | 'dev'
  description: string
  status: 'connected' | 'available' | 'coming_soon'
  logoText: string
  color: string
}

const INTEGRATIONS: Integration[] = [
  { id: 'slack', name: 'Slack', category: 'comm', description: 'Notificaciones, DMs y menciones en canales.', status: 'connected', logoText: 'S', color: '#4A154B' },
  { id: 'teams', name: 'Microsoft Teams', category: 'comm', description: 'Mismo flujo que Slack, para workspaces Microsoft.', status: 'available', logoText: 'T', color: '#6264A7' },
  { id: 'gcal', name: 'Google Calendar', category: 'calendar', description: 'Sesiones 1:1 y evaluaciones se sincronizan con el calendario.', status: 'connected', logoText: 'G', color: '#4285F4' },
  { id: 'outlook', name: 'Outlook Calendar', category: 'calendar', description: 'Alternativa a Google Calendar para tenants Microsoft.', status: 'available', logoText: 'O', color: '#0078D4' },
  { id: 'google_sso', name: 'Google Workspace SSO', category: 'identity', description: 'Login con Google Workspace + sincronización de equipos.', status: 'connected', logoText: 'G', color: '#EA4335' },
  { id: 'azure_sso', name: 'Microsoft Entra ID (SSO)', category: 'identity', description: 'SAML/OIDC con Microsoft para empresas enterprise.', status: 'available', logoText: 'M', color: '#0078D4' },
  { id: 'drive', name: 'Google Drive', category: 'files', description: 'Adjuntos nativos en tareas y comentarios.', status: 'available', logoText: 'D', color: '#0F9D58' },
  { id: 'notion', name: 'Notion', category: 'dev', description: 'Sincroniza docs y páginas como referencias.', status: 'coming_soon', logoText: 'N', color: '#000000' },
  { id: 'jira', name: 'Jira', category: 'dev', description: 'Bidireccional: tareas de Jira ↔ Interna.', status: 'coming_soon', logoText: 'J', color: '#0052CC' },
]

const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'comm', label: 'Comunicación' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'identity', label: 'SSO / Identidad' },
  { id: 'files', label: 'Archivos' },
  { id: 'dev', label: 'Productividad' },
] as const

export default function IntegracionesPage() {
  // Solo tenant_admin gestiona integraciones del workspace.
  const allowed = useRequireRole(['tenant_admin'])
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]['id']>('all')
  const items = filter === 'all' ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter)

  const connected = INTEGRATIONS.filter((i) => i.status === 'connected').length

  if (!allowed) return null

  return (
    <div>
      <SectionTitle
        kicker="Workspace · Integraciones"
        title="Conecta tus herramientas"
        sub={`${connected} conectadas · ${INTEGRATIONS.length - connected} disponibles para integrar`}
        right={
          <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
            <Icon.Auto size={13} />
            Ver webhooks
          </button>
        }
      />

      {/* Category tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => {
          const active = filter === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] font-medium transition',
                active
                  ? 'border-primary-ink bg-primary-soft text-primary-ink'
                  : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {items.map((i) => (
          <div
            key={i.id}
            className="flex flex-col rounded-lg border border-paper-line bg-paper-raised p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md font-mono text-[15px] font-bold text-white"
                style={{ background: i.color }}
              >
                {i.logoText}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{i.name}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.4px] text-ink-3">
                  {CATEGORIES.find((c) => c.id === i.category)?.label}
                </div>
              </div>
            </div>
            <p className="mb-3 flex-1 text-[11.5px] leading-[1.5] text-ink-3">{i.description}</p>
            <div className="flex items-center justify-between">
              {i.status === 'connected' ? (
                <>
                  <PaperBadge tone="ok">
                    <Icon.Check size={9} className="mr-1" /> Conectada
                  </PaperBadge>
                  <button className="text-[11px] text-destructive hover:underline">
                    Desconectar
                  </button>
                </>
              ) : i.status === 'available' ? (
                <>
                  <PaperBadge tone="neutral">Disponible</PaperBadge>
                  <button className="inline-flex items-center gap-1 rounded-md bg-ink px-2.5 py-[5px] text-[11px] font-medium text-paper-surface hover:bg-ink-2">
                    <Icon.Plus size={10} />
                    Conectar
                  </button>
                </>
              ) : (
                <>
                  <PaperBadge tone="warn">Próximamente</PaperBadge>
                  <button className="text-[11px] text-ink-3 hover:text-ink">
                    Notificarme
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
