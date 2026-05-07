'use client'

import { useState } from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { Icon } from '@/components/ui/icon'
import { SectionTitle } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { Can } from '@/components/shared/can'
import { useProfiles } from '@/features/people/hooks/use-people'
import { PersonRow } from '@/features/people/components/person-row'
import { InviteDialog } from '@/features/people/components/invite-dialog'
import { useRequireRole } from '@/hooks/use-require-role'
import { cn } from '@/lib/utils'

const KINDS = [
  { id: 'intern', label: 'Practicantes' },
  { id: 'mentor', label: 'Mentores' },
  { id: 'staff', label: 'Líderes y staff' },
  { id: 'hr', label: 'RRHH' },
  { id: 'admin', label: 'Admins' },
] as const

export default function PracticantesPage() {
  const allowed = useRequireRole(['tenant_admin', 'hr', 'team_lead', 'mentor'])
  const [q, setQ] = useQueryState('q', parseAsString.withDefault(''))
  const [kind, setKind] = useQueryState('kind', parseAsString)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (!allowed) return null

  const { data, isLoading } = useProfiles({
    q: q || undefined,
    kind: kind ?? undefined,
    per_page: 50,
  })
  const profiles = data?.data ?? []

  const stats = {
    total: profiles.length,
    interns: profiles.filter((p) => p.kind === 'intern').length,
    mentors: profiles.filter((p) => p.kind === 'mentor').length,
  }

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Workspace · personas"
        title="Practicantes, mentores y equipo"
        sub={
          isLoading
            ? 'Cargando…'
            : `${stats.total} totales · ${stats.interns} practicantes · ${stats.mentors} mentores`
        }
        right={
          <Can capability="invite_users">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={13} />
              Invitar persona
            </button>
          </Can>
        }
      />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[280px] flex-1">
          <Icon.Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={q ?? ''}
            onChange={(e) => setQ(e.target.value || null)}
            className="w-full rounded-md border border-paper-line bg-paper-raised py-[7px] pl-8 pr-3 text-[13px] text-ink outline-none focus:border-primary"
          />
        </div>
        {KINDS.map((k) => {
          const active = kind === k.id
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(active ? null : k.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] font-medium transition',
                active
                  ? 'border-primary-ink bg-primary-soft text-primary-ink'
                  : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
              )}
            >
              {k.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
          <Icon.People size={22} className="mx-auto mb-2 text-ink-3" />
          <p className="text-[13px] text-ink-3">Sin resultados con estos filtros.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
          {profiles.map((p, i) => (
            <div
              key={p.id}
              className={cn(i < profiles.length - 1 && 'border-b border-paper-line-soft')}
            >
              <PersonRow profile={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
