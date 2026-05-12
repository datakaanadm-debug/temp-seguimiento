'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { TonalAvatar } from '@/components/ui/primitives'
import { useRequireRole } from '@/hooks/use-require-role'
import { cn } from '@/lib/utils'
import { listAuditLog, listAuditLogNames } from '@/features/audit/api'

/**
 * Mapeo log_name → icono + tono. Cualquier log_name no listado cae al default.
 */
const LOG_NAME_META: Record<
  string,
  { label: string; icon: keyof typeof Icon; tone: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info' }
> = {
  auth: { label: 'Sesión', icon: 'People', tone: 'info' },
  identity: { label: 'Cuentas', icon: 'People', tone: 'info' },
  tasks: { label: 'Tareas', icon: 'Tasks', tone: 'accent' },
  projects: { label: 'Proyectos', icon: 'Panel', tone: 'accent' },
  performance: { label: 'Evaluaciones', icon: 'Eval', tone: 'ok' },
  tracking: { label: 'Bitácoras', icon: 'Log', tone: 'warn' },
  people: { label: 'Personas', icon: 'People', tone: 'accent' },
  mentorship: { label: 'Mentoría', icon: 'Mentor', tone: 'accent' },
  okrs: { label: 'OKRs', icon: 'Flag', tone: 'ok' },
  onboarding: { label: 'Onboarding', icon: 'Onboard', tone: 'info' },
  organization: { label: 'Organización', icon: 'Settings', tone: 'neutral' },
}

const DEFAULT_META = { label: 'Otro', icon: 'AlertTriangle' as const, tone: 'neutral' as const }

function metaFor(logName: string | null) {
  if (!logName) return DEFAULT_META
  return LOG_NAME_META[logName] ?? { ...DEFAULT_META, label: logName }
}

function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'hace segundos'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function AuditLogPage() {
  const allowed = useRequireRole(['tenant_admin', 'supervisor'])
  const [logName, setLogName] = useQueryState('log_name', parseAsString)
  const [q, setQ] = useQueryState('q', parseAsString.withDefault(''))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: namesData } = useQuery({
    queryKey: ['audit-log-names'],
    queryFn: listAuditLogNames,
    enabled: !!allowed,
    staleTime: 5 * 60_000,
  })
  const logNames = namesData?.data ?? []

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-log', { logName, q, page }],
    queryFn: () => listAuditLog({
      log_name: logName ?? undefined,
      q: q || undefined,
      per_page: 50,
      page,
    }),
    enabled: !!allowed,
  })

  const items = data?.data ?? []
  const meta = data?.meta

  if (!allowed) return null

  return (
    <div>
      <SectionTitle
        kicker="Workspace · Auditoría"
        title="Registro de actividad"
        sub={
          isLoading
            ? 'Cargando…'
            : meta
              ? `${meta.total.toLocaleString('es-MX')} eventos registrados · página ${meta.current_page} de ${meta.last_page}`
              : '—'
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Pill todos */}
        <button
          type="button"
          onClick={() => { setLogName(null); setPage(1) }}
          className={cn(
            'rounded-full border px-3 py-1 text-[12px] font-medium transition',
            !logName
              ? 'border-primary-ink bg-primary-soft text-primary-ink'
              : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
          )}
        >
          Todos
        </button>
        {logNames.map((name) => {
          const m = metaFor(name)
          const active = logName === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => { setLogName(name); setPage(1) }}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] font-medium transition',
                active
                  ? 'border-primary-ink bg-primary-soft text-primary-ink'
                  : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
              )}
            >
              {m.label}
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Icon.Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder="Buscar en descripción…"
              className="h-8 w-64 rounded-md border border-paper-line bg-paper-raised pl-7 pr-2 text-[12.5px] outline-none focus:border-primary"
            />
          </div>
          {isFetching && <Icon.Clock size={12} className="animate-pulse text-ink-3" />}
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
          <p className="text-[13px] text-ink-3">
            No hay eventos {logName ? `de tipo ${metaFor(logName).label.toLowerCase()}` : ''} {q ? `que coincidan con "${q}"` : ''}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
          {items.map((entry, i) => {
            const m = metaFor(entry.log_name)
            const IconC = Icon[m.icon]
            const isExpanded = expanded === entry.id
            const hasProps = entry.properties && Object.keys(entry.properties).length > 0
            return (
              <div
                key={entry.id}
                className={cn(
                  'group',
                  i < items.length - 1 && 'border-b border-paper-line-soft',
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : entry.id)}
                  className="grid w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper-bg-2"
                  style={{ gridTemplateColumns: '32px 90px 28px 1fr 110px 16px' }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md"
                    style={{
                      background: 'hsl(var(--accent-soft))',
                      color: 'hsl(var(--accent-ink))',
                    }}
                  >
                    <IconC size={14} />
                  </div>
                  <PaperBadge tone={m.tone}>{m.label}</PaperBadge>
                  <TonalAvatar
                    size={24}
                    name={entry.causer?.name ?? entry.causer?.email ?? '—'}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-ink">
                      {entry.description ?? `${entry.event ?? 'evento'} en ${entry.subject?.type ?? 'objeto'}`}
                    </div>
                    <div className="truncate text-[10.5px] text-ink-3 font-mono">
                      {entry.event && <span className="mr-2">{entry.event}</span>}
                      {entry.subject?.type && <span className="mr-2">· {entry.subject.type}</span>}
                      {entry.subject?.id && <span title={entry.subject.id}>#{entry.subject.id.slice(0, 8)}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[11px] text-ink-2" title={formatExact(entry.created_at)}>
                      {formatRelative(entry.created_at)}
                    </div>
                  </div>
                  <Icon.Chev
                    size={12}
                    className={cn('text-ink-muted transition-transform', isExpanded && 'rotate-90')}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-paper-line-soft bg-paper-bg-2 px-4 py-3">
                    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <Detail label="Fecha exacta" value={formatExact(entry.created_at)} />
                      <Detail label="Request ID" value={entry.request_id ?? '—'} mono />
                      <Detail label="IP" value={entry.ip_address ?? '—'} mono />
                      <Detail label="Causer ID" value={entry.causer.id?.slice(0, 8) ?? '—'} mono />
                      <Detail label="Subject" value={`${entry.subject.type ?? '—'}${entry.subject.id ? ` · ${entry.subject.id.slice(0, 8)}` : ''}`} mono />
                      <Detail label="Event" value={entry.event ?? '—'} mono />
                    </div>
                    {hasProps && (
                      <div className="mt-3">
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.5px] text-ink-3">
                          Properties
                        </div>
                        <pre className="overflow-x-auto rounded-md border border-paper-line bg-paper-surface p-2 font-mono text-[11px] text-ink-2">
                          {JSON.stringify(entry.properties, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink-3">
            {(meta.current_page - 1) * meta.per_page + 1}-
            {Math.min(meta.current_page * meta.per_page, meta.total)} de {meta.total.toLocaleString('es-MX')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={meta.current_page <= 1 || isFetching}
              className="rounded-md border border-paper-line bg-paper-raised px-2.5 py-1 text-[12px] text-ink-2 hover:border-paper-line-soft disabled:opacity-30"
            >
              ← Anterior
            </button>
            <span className="font-mono text-[11px] text-ink-3">
              {meta.current_page} / {meta.last_page}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(meta.last_page, page + 1))}
              disabled={meta.current_page >= meta.last_page || isFetching}
              className="rounded-md border border-paper-line bg-paper-raised px-2.5 py-1 text-[12px] text-ink-2 hover:border-paper-line-soft disabled:opacity-30"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Footer educativo */}
      <div className="mt-8 rounded-lg border border-dashed border-paper-line bg-paper-surface p-4 text-[11.5px] leading-[1.5] text-ink-3">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.5px] text-ink-3">
          Sobre este registro
        </div>
        Este log es <b>inmutable</b> — sólo se permite INSERT a nivel de DB. Cubre logins,
        evaluaciones, bitácoras, asignaciones de mentor, tareas y proyectos. Si una acción
        relevante no aparece, probablemente falta su listener — avísale a soporte.
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.5px] text-ink-3">{label}</div>
      <div className={cn('mt-0.5 text-[12px] text-ink', mono && 'font-mono text-[11.5px]')}>{value}</div>
    </div>
  )
}
