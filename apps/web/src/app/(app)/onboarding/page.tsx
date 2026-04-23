'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useQueryState, parseAsString } from 'nuqs'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import { getChecklist, toggleItem } from '@/features/onboarding/api/onboarding'
import type { PaginatedResponse, Profile } from '@/types/api'

export default function OnboardingPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isIntern = user?.role === 'intern'

  const [internUserId, setInternUserId] = useQueryState('intern_id', parseAsString)

  // Lista de practicantes para picker (admin/hr)
  const { data: internsData } = useQuery({
    queryKey: ['profiles-interns-onboarding'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { kind: 'intern', per_page: 50 },
      }),
    enabled: !isIntern,
  })
  const interns = internsData?.data ?? []

  const effectiveInternId = isIntern
    ? user?.id ?? null
    : (internUserId ?? interns[0]?.user_id ?? null)

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-checklist', effectiveInternId],
    queryFn: () => getChecklist(effectiveInternId ?? undefined),
    enabled: !!effectiveInternId || isIntern,
  })

  const toggle = useMutation({
    mutationFn: (id: string) => toggleItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-checklist', effectiveInternId] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  })

  const selectedIntern = interns.find((p) => p.user_id === effectiveInternId)
  const internName =
    selectedIntern?.user?.name ??
    selectedIntern?.user?.email ??
    (isIntern ? user?.name : 'Sin seleccionar')

  const checklist = data?.data

  if (!effectiveInternId) {
    return (
      <div className="mx-auto max-w-[1060px] px-7 py-5">
        <SectionTitle
          kicker="Onboarding"
          title="Selecciona un practicante"
          sub="Escoge con quién quieres trabajar para ver su checklist."
        />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1060px] px-7 py-5 pb-10">
      <SectionTitle
        kicker={`Onboarding${isIntern ? '' : ` · ${internName}`}`}
        title="Checklist de ingreso"
        sub={
          isLoading
            ? 'Cargando…'
            : checklist
              ? `${checklist.done} de ${checklist.total} pasos completados`
              : ''
        }
        right={
          <>
            {!isIntern && interns.length > 0 && (
              <select
                value={effectiveInternId}
                onChange={(e) => setInternUserId(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 focus:border-primary"
              >
                {interns.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.user?.name ?? p.user?.email}
                  </option>
                ))}
              </select>
            )}
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Attach size={12} />
              Exportar PDF
            </button>
          </>
        }
      />

      {isLoading || !checklist ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          {/* Hero progress */}
          <div
            className="mb-5 grid items-center gap-5 rounded-lg border border-paper-line bg-paper-raised p-[22px]"
            style={{ gridTemplateColumns: 'auto 1fr auto' }}
          >
            <div className="relative h-20 w-20">
              <svg width={80} height={80} viewBox="0 0 80 80">
                <circle
                  cx={40}
                  cy={40}
                  r={34}
                  fill="none"
                  stroke="hsl(var(--paper-line-soft))"
                  strokeWidth={6}
                />
                <circle
                  cx={40}
                  cy={40}
                  r={34}
                  fill="none"
                  stroke="hsl(var(--accent-h))"
                  strokeWidth={6}
                  strokeDasharray={`${(checklist.progress_percent / 100) * 213.6} 213.6`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center font-serif text-[18px]">
                {checklist.progress_percent}%
              </div>
            </div>
            <div>
              <div className="mb-1 font-serif text-[22px] tracking-tight">
                {checklist.progress_percent === 100
                  ? 'Onboarding completado 🎉'
                  : 'Avanza paso a paso'}
              </div>
              <div className="text-[13px] text-ink-2">
                {checklist.progress_percent === 100
                  ? 'Todos los pasos están listos. ¡Éxito con tus primeros proyectos!'
                  : `Faltan ${checklist.total - checklist.done} pasos — cada uno toma entre 5 y 20 min.`}
              </div>
              <div className="mt-2.5 flex gap-1.5">
                {Array.from({ length: checklist.total }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-sm',
                      i < checklist.done ? 'bg-primary' : 'bg-paper-line-soft',
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[11px] text-ink-3">DÍA</div>
              <div className="font-serif text-[38px] leading-none">12</div>
              <div className="font-mono text-[11px] text-ink-3">de 90</div>
            </div>
          </div>

          {/* Groups */}
          {checklist.groups.map((g, gi) => {
            const gDone = g.items.filter((i) => i.done).length
            return (
              <div key={g.name} className="mb-3.5">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                    {String(gi + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[14px] font-semibold text-ink">{g.name}</span>
                  <span className="h-px flex-1 bg-paper-line" />
                  <span className="font-mono text-[11px] text-ink-3">
                    {gDone}/{g.items.length}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
                  {g.items.map((it, ii) => (
                    <label
                      key={it.id}
                      className={cn(
                        'grid cursor-pointer items-center gap-3 px-3.5 py-2.5 transition hover:bg-paper-bg-2',
                        ii < g.items.length - 1 && 'border-b border-paper-line-soft',
                        toggle.isPending && 'opacity-50',
                      )}
                      style={{ gridTemplateColumns: '24px 1fr auto auto' }}
                    >
                      <input
                        type="checkbox"
                        checked={it.done}
                        disabled={toggle.isPending}
                        onChange={() => toggle.mutate(it.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <div>
                        <div
                          className={cn(
                            'text-[13px]',
                            it.done ? 'text-ink-3 line-through' : 'text-ink',
                          )}
                        >
                          {it.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-3">
                          {it.responsible_role && (
                            <>
                              Responsable: <b className="text-ink-2">{it.responsible_role}</b>
                            </>
                          )}
                          {it.due_at && (
                            <>
                              {' · vence '}
                              <b className="text-ink-2">
                                {new Date(it.due_at).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </b>
                            </>
                          )}
                        </div>
                      </div>
                      {it.due_at && !it.done && isOverdue(it.due_at) && (
                        <PaperBadge tone="warn" className="!text-[10px]">
                          vencido
                        </PaperBadge>
                      )}
                      {it.done ? (
                        <Icon.Check size={14} className="text-success" />
                      ) : (
                        <Icon.Chev size={12} className="text-ink-muted" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date()
}
