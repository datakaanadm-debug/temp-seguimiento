'use client'

import { Fragment, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge,
} from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

// Mock — cuando exista el módulo Automation en backend se conecta a /api/v1/rules
// El shape trigger/condition/action ya está alineado con el doc sección 14.

type RuleStep = {
  kind: 'trigger' | 'condition' | 'action'
  label: string
  title: string
  meta: string
  icon: IconName
  tone: 'terracotta' | 'ochre' | 'olive' | 'cobalt' | 'purple'
}

const TONE_MAP: Record<RuleStep['tone'], { color: string; border: string; bg: string; ink: string }> = {
  terracotta: {
    color: '#c8532b', border: '#c8532b66', bg: 'hsl(14 65% 94%)', ink: '#9b3d1a',
  },
  ochre: {
    color: '#b8892a', border: '#b8892a66', bg: 'hsl(39 63% 93%)', ink: '#8a6420',
  },
  olive: {
    color: '#5a7a3f', border: '#5a7a3f66', bg: 'hsl(91 32% 92%)', ink: '#3d5428',
  },
  cobalt: {
    color: '#456b7a', border: '#456b7a66', bg: 'hsl(199 28% 92%)', ink: '#254260',
  },
  purple: {
    color: '#8a6b9e', border: '#8a6b9e66', bg: 'hsl(276 20% 93%)', ink: '#5c3d73',
  },
}

type Rule = {
  id: string
  title: string
  enabled: boolean
  runs: number
  description: string
  lastRun?: string
  steps?: RuleStep[]
}

const RULES: Rule[] = [
  {
    id: 'r1',
    title: 'Alertar bloqueo sin respuesta en 24h',
    enabled: true,
    runs: 42,
    description: 'Si una tarea está en "Bloqueada" > 24h → notificar al líder y mentor',
    lastRun: 'hace 2h',
  },
  {
    id: 'r2',
    title: 'Resumir bitácora semanal con IA',
    enabled: true,
    runs: 18,
    description: 'Cada viernes 16:00 → generar resumen de la semana y enviar a RH',
    lastRun: 'viernes pasado',
  },
  {
    id: 'r3',
    title: 'Escalar tarea vencida +3 días',
    enabled: true,
    runs: 9,
    description: 'Si due_date + 3d y estado ≠ Done → reasignar a líder + marcar roja',
    lastRun: 'hace 5d',
  },
  {
    id: 'r4',
    title: 'Mensaje de bienvenida a practicantes',
    enabled: false,
    runs: 0,
    description: 'Cuando un practicante se añade → enviar DM por Slack con checklist',
  },
  {
    id: 'r5',
    title: 'Feedback post-sesión 1:1',
    enabled: true,
    runs: 24,
    description: '10 min después de cada 1:1 → pedir rating + nota al practicante',
    lastRun: 'ayer',
  },
  {
    id: 'r6',
    title: 'Detectar baja productividad',
    enabled: true,
    runs: 7,
    description: 'Si bitácora < 3 días/semana × 2 semanas → alerta a RH',
    lastRun: 'hace 3d',
  },
]

const FEATURED_RECIPE: RuleStep[] = [
  {
    kind: 'trigger',
    label: 'DISPARADOR',
    title: 'Se crea un bloqueo',
    meta: 'cualquier tarea · cualquier practicante',
    icon: 'Flag',
    tone: 'terracotta',
  },
  {
    kind: 'condition',
    label: 'CONDICIÓN',
    title: 'No resuelto en 4 horas',
    meta: 'en horario laboral',
    icon: 'Clock',
    tone: 'ochre',
  },
  {
    kind: 'action',
    label: 'ACCIÓN',
    title: 'Notificar líder + mentor',
    meta: 'vía Slack + email',
    icon: 'Bell',
    tone: 'olive',
  },
]

export default function AutomatizacionPage() {
  const [rules, setRules] = useState(RULES)
  const active = rules.filter((r) => r.enabled).length
  const totalRuns = rules.reduce((a, r) => a + r.runs, 0)

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }

  return (
    <div className="mx-auto max-w-[1100px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Automatización"
        title="Reglas y flujos inteligentes"
        sub={`${active} reglas activas · ${totalRuns} ejecuciones este mes · ahorran ~${Math.round(totalRuns * 0.15)}h/sem`}
        right={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Auto size={12} />
              Plantillas
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2">
              <Icon.Plus size={12} />
              Nueva regla
            </button>
          </>
        }
      />

      {/* Featured recipe */}
      <PaperCard className="mb-5">
        <div className="mb-3 flex items-center gap-2.5">
          <PaperBadge tone="accent">Plantilla</PaperBadge>
          <span className="text-[13px] font-semibold text-ink">
            Cuando un practicante reporta un bloqueo…
          </span>
          <span className="ml-auto font-mono text-[11px] text-ink-3">últimas 24h · v2</span>
        </div>
        <div
          className="grid items-stretch gap-2.5"
          style={{ gridTemplateColumns: '1fr auto 1fr auto 1fr' }}
        >
          {FEATURED_RECIPE.map((s, i, arr) => {
            const tone = TONE_MAP[s.tone]
            const IconC = Icon[s.icon]
            return (
              <Fragment key={i}>
                <div
                  className="rounded-md border p-3.5"
                  style={{
                    background: 'hsl(var(--paper-surface))',
                    borderColor: tone.border,
                    borderLeft: `3px solid ${tone.color}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <IconC size={13} style={{ color: tone.color }} />
                    <span
                      className="font-mono text-[10px] font-semibold uppercase tracking-[0.6px]"
                      style={{ color: tone.color }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[13px] font-semibold text-ink">{s.title}</div>
                  <div className="mt-0.5 text-[11px] text-ink-3">{s.meta}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center justify-center">
                    <Icon.Chev size={16} className="text-ink-3" />
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </PaperCard>

      {/* Rules list */}
      <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
        <div
          className="grid border-b border-paper-line px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3"
          style={{ gridTemplateColumns: '48px 1fr 120px 90px 70px' }}
        >
          <span />
          <span>Regla</span>
          <span>Ejecuciones</span>
          <span>Estado</span>
          <span />
        </div>
        {rules.map((a, i) => (
          <div
            key={a.id}
            className={cn(
              'grid items-center gap-3 px-4 py-3',
              i < rules.length - 1 && 'border-b border-paper-line-soft',
            )}
            style={{ gridTemplateColumns: '48px 1fr 120px 90px 70px' }}
          >
            <div
              className={cn(
                'grid h-8 w-8 place-items-center rounded-md transition',
                a.enabled
                  ? 'bg-primary-soft text-primary-ink'
                  : 'bg-paper-line-soft text-ink-3',
              )}
            >
              <Icon.Auto size={14} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-ink">{a.title}</div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-ink-3">
                {a.description}
              </div>
            </div>
            <div>
              <div className="font-mono text-[12px] text-ink-2">{a.runs}/mes</div>
              {a.lastRun && (
                <div className="mt-0.5 text-[10.5px] text-ink-3">última: {a.lastRun}</div>
              )}
            </div>
            <div>
              <ToggleSwitch checked={a.enabled} onChange={() => toggleRule(a.id)} />
            </div>
            <button
              type="button"
              className="justify-self-end rounded-md p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
              aria-label="Configurar regla"
            >
              <Icon.Settings size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative h-[22px] w-10 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-paper-line',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-[18px] w-[18px] rounded-full bg-paper-raised shadow-paper-1 transition-transform',
          checked ? 'translate-x-[20px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
