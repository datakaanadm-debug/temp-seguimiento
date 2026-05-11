'use client'

import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon, type IconName } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { Can } from '@/components/shared/can'
import { useRequireRole } from '@/hooks/use-require-role'
import { cn } from '@/lib/utils'
import {
  listAutomationRules,
  toggleAutomationRule,
  type AutomationRule,
} from '@/features/automation/api/automation'
import { NewRuleDialog } from '@/features/automation/components/new-rule-dialog'

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

function formatLastRun(iso: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const hours = diffMs / 3_600_000
  if (hours < 1) return 'hace minutos'
  if (hours < 24) return `hace ${Math.round(hours)}h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`
  const weeks = Math.round(days / 7)
  if (weeks === 1) return 'hace 1 semana'
  return `hace ${weeks} semanas`
}

export default function AutomatizacionPage() {
  const allowed = useRequireRole(['tenant_admin', 'hr'])
  const qc = useQueryClient()
  const [newOpen, setNewOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: listAutomationRules,
  })

  // Todos los hooks ANTES del early return — si useMutation va después de
  // `if (!allowed) return null`, el conteo de hooks cambia cuando allowed
  // pasa de false a true y React crashea la página.
  const toggle = useMutation({
    mutationFn: toggleAutomationRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo actualizar la regla'),
  })

  if (!allowed) return null
  const rules = data?.data ?? []
  const meta = data?.meta ?? { total: 0, active: 0, runs_this_month: 0 }

  return (
    <div className="mx-auto max-w-[1100px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Automatización"
        title="Reglas y flujos inteligentes"
        sub={
          isLoading
            ? 'Cargando reglas…'
            // Removida "ahorran ~Xh/sem" — el factor 0.15 era inventado.
            // Cuando exista `avg_time_saved_seconds` por rule en backend,
            // re-introducir como suma real.
            : `${meta.active} reglas activas · ${meta.runs_this_month} ejecuciones este mes`
        }
        right={
          <Can capability="create_automations">
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={12} />
              Nueva regla
            </button>
          </Can>
        }
      />

      <NewRuleDialog open={newOpen} onOpenChange={setNewOpen} />

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
      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center text-[13px] text-ink-3">
          Sin reglas configuradas. Crea la primera desde "Nueva regla".
        </div>
      ) : (
        <RulesTable
          rules={rules}
          onToggle={(id) => toggle.mutate(id)}
          togglePending={toggle.isPending}
        />
      )}
    </div>
  )
}

function RulesTable({
  rules,
  onToggle,
  togglePending,
}: {
  rules: AutomationRule[]
  onToggle: (id: string) => void
  togglePending: boolean
}) {
  return (
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
      {rules.map((a, i) => {
        const lastRun = formatLastRun(a.last_run_at)
        return (
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
                {a.description ?? a.trigger_kind}
              </div>
            </div>
            <div>
              <div className="font-mono text-[12px] text-ink-2">{a.runs_count}/mes</div>
              {lastRun && (
                <div className="mt-0.5 text-[10.5px] text-ink-3">última: {lastRun}</div>
              )}
            </div>
            <div>
              <ToggleSwitch
                checked={a.enabled}
                disabled={togglePending}
                onChange={() => onToggle(a.id)}
              />
            </div>
            <button
              type="button"
              className="justify-self-end rounded-md p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-ink disabled:opacity-40"
              aria-label="Configurar regla"
              title="Configurar (próximamente)"
              disabled
            >
              <Icon.Settings size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative h-[22px] w-10 rounded-full transition-colors disabled:opacity-60',
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
