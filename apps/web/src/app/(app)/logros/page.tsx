'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon, type IconName } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import {
  listBadges, getUserBadges, getLeaderboard, getWall, getMyStats,
  type BadgeTier,
} from '@/features/gamification/api/gamification'

type View = 'mine' | 'catalog' | 'rankings'
const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'mine', label: 'Mis logros' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'rankings', label: 'Rankings' },
]

const TIER_META = {
  bronze: { label: 'Bronce', bg: 'hsl(28 48% 88%)', ink: 'hsl(28 55% 35%)', border: 'hsl(28 48% 70%)' },
  silver: { label: 'Plata', bg: 'hsl(210 10% 90%)', ink: 'hsl(210 10% 35%)', border: 'hsl(210 10% 75%)' },
  gold: { label: 'Oro', bg: 'hsl(43 71% 85%)', ink: 'hsl(39 63% 28%)', border: 'hsl(43 63% 65%)' },
  platinum: { label: 'Platino', bg: 'hsl(194 21% 88%)', ink: 'hsl(199 28% 25%)', border: 'hsl(199 28% 70%)' },
} as const

export default function LogrosPage() {
  const me = useCurrentUser()
  const [view, setView] = useState<View>('mine')

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['gamif-stats', me.id],
    queryFn: () => getMyStats(me.id),
  })
  const { data: catalogData } = useQuery({
    queryKey: ['gamif-catalog'],
    queryFn: () => listBadges(),
  })
  const { data: userBadgesData } = useQuery({
    queryKey: ['gamif-user-badges', me.id],
    queryFn: () => getUserBadges(me.id),
  })
  const { data: leaderboardData } = useQuery({
    queryKey: ['gamif-leaderboard'],
    queryFn: () => getLeaderboard(),
    enabled: view === 'rankings',
  })
  const { data: wallData } = useQuery({
    queryKey: ['gamif-wall'],
    queryFn: () => getWall(),
    enabled: view === 'rankings',
  })

  const stats = statsData?.data
  const catalog = catalogData?.data ?? []
  const userBadges = userBadgesData?.data ?? []

  const earnedMap = new Map(userBadges.filter((ub) => ub.earned).map((ub) => [ub.badge_id, ub] as const))
  const inProgressMap = new Map(userBadges.filter((ub) => !ub.earned).map((ub) => [ub.badge_id, ub] as const))

  const earned = catalog.filter((b) => earnedMap.has(b.id)).map((b) => ({
    ...b,
    earned: true,
    earnedAt: earnedMap.get(b.id)!.earned_at,
    progress: 100,
  }))
  const inProgress = catalog
    .filter((b) => !earnedMap.has(b.id) && inProgressMap.has(b.id))
    .map((b) => ({
      ...b,
      earned: false,
      earnedAt: null,
      progress: inProgressMap.get(b.id)!.progress_percent,
    }))
  const locked = catalog
    .filter((b) => !earnedMap.has(b.id) && !inProgressMap.has(b.id))
    .map((b) => ({ ...b, earned: false, earnedAt: null, progress: 0 }))

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Gamificación"
        title="Logros y reconocimientos"
        sub={
          statsLoading
            ? 'Cargando…'
            : stats
              ? `${stats.earned_badges} de ${catalog.length} desbloqueados · racha actual ${stats.streak_days} días · nivel ${stats.level}`
              : ''
        }
        right={
          <div className="inline-flex rounded-md border border-paper-line bg-paper-raised p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  'rounded-[4px] px-2.5 py-[5px] text-[12px] transition',
                  view === v.id
                    ? 'bg-paper-bg-2 font-semibold text-ink'
                    : 'font-medium text-ink-3 hover:text-ink',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        }
      />

      {view === 'mine' && stats && (
        <>
          <div className="mb-4 grid gap-3 grid-cols-3">
            <PaperCard>
              <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                Nivel
              </div>
              <div className="mt-2 font-serif text-[32px] leading-none tracking-tight text-ink">
                {stats.level}
              </div>
              <div className="mt-1 text-[12px] text-ink-3">
                #{stats.leaderboard_position} del tenant
              </div>
            </PaperCard>
            <PaperCard>
              <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                Racha bitácora
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-serif text-[32px] leading-none tracking-tight text-ink">
                  {stats.streak_days}
                </span>
                <span className="text-[13px] text-ink-3">días</span>
                <span className="ml-auto text-[22px]">🔥</span>
              </div>
              <div className="mt-1 text-[12px] text-ink-3">
                Mejor racha: {stats.best_streak} días
              </div>
            </PaperCard>
            <PaperCard>
              <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                Puntos totales
              </div>
              <div className="mt-2 font-serif text-[32px] leading-none tracking-tight text-ink">
                {stats.total_points.toLocaleString()}
              </div>
              <PaperBadge tone="accent" className="mt-2.5 !text-[10px]">
                {stats.earned_badges} badges ganadas
              </PaperBadge>
            </PaperCard>
          </div>

          <div className="mb-6">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
              Desbloqueados · {earned.length}
            </div>
            <BadgeGrid badges={earned} />
          </div>

          {inProgress.length > 0 && (
            <div>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                En progreso · {inProgress.length}
              </div>
              <BadgeGrid badges={inProgress} />
            </div>
          )}
        </>
      )}

      {view === 'catalog' && (
        <div>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
            Catálogo completo · {catalog.length} badges
          </div>
          <BadgeGrid
            badges={[...earned, ...inProgress, ...locked].slice(0, catalog.length)}
          />
        </div>
      )}

      {view === 'rankings' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
          <PaperCard title="Leaderboard · este mes" noPad>
            {!leaderboardData ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <div
                  className="grid border-b border-paper-line px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3"
                  style={{ gridTemplateColumns: '32px 1fr 70px 70px 60px' }}
                >
                  <span>#</span>
                  <span>Nombre</span>
                  <span>Puntos</span>
                  <span>Racha</span>
                  <span className="text-right">Badges</span>
                </div>
                {leaderboardData.data.map((u, i) => (
                  <div
                    key={u.user_id}
                    className={cn(
                      'grid items-center gap-3 px-4 py-3 text-[13px]',
                      i < leaderboardData.data.length - 1 && 'border-b border-paper-line-soft',
                    )}
                    style={{ gridTemplateColumns: '32px 1fr 70px 70px 60px' }}
                  >
                    <span className="font-mono text-[11px] text-ink-3">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <TonalAvatar size={28} name={u.name ?? u.email} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{u.name ?? u.email}</div>
                        <div className="text-[11px] text-ink-3">{u.area ?? u.level}</div>
                      </div>
                    </div>
                    <span className="font-mono font-semibold">{u.total_points.toLocaleString()}</span>
                    <span className="font-mono text-ink-2">
                      {u.streak_days > 0 ? `🔥 ${u.streak_days}` : '—'}
                    </span>
                    <span className="text-right font-mono">{u.badge_count}</span>
                  </div>
                ))}
              </>
            )}
          </PaperCard>

          <PaperCard title="Muro de logros" right={<PaperBadge tone="accent">vivo</PaperBadge>}>
            {!wallData ? (
              <Skeleton className="h-48" />
            ) : wallData.data.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-3">
                Sin logros recientes en el tenant.
              </p>
            ) : (
              <div className="-my-2">
                {wallData.data.map((w, i) => {
                  const tierMeta = TIER_META[w.badge_tier]
                  return (
                    <div
                      key={w.id}
                      className={cn(
                        'flex items-start gap-2.5 py-2.5',
                        i > 0 && 'border-t border-paper-line-soft',
                      )}
                    >
                      <TonalAvatar size={32} name={w.user_name} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] leading-[1.45] text-ink-2">
                          <b className="text-ink">{w.user_name?.split(' ')[0] ?? '—'}</b>{' '}
                          desbloqueó{' '}
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold"
                            style={{ background: tierMeta.bg, color: tierMeta.ink }}
                          >
                            {w.badge_name}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-3">
                          {formatRel(w.earned_at)}
                        </div>
                      </div>
                      <span className="text-lg">🎉</span>
                    </div>
                  )
                })}
              </div>
            )}
          </PaperCard>
        </div>
      )}
    </div>
  )
}

function BadgeGrid({ badges }: { badges: Array<{
  id: string
  name: string
  description: string
  icon: string
  tier: BadgeTier
  earned: boolean
  earnedAt: string | null
  progress: number
}> }) {
  if (badges.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-6 text-center text-[13px] text-ink-3">
        Sin badges aquí.
      </div>
    )
  }
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
    >
      {badges.map((b) => (
        <BadgeCard key={b.id} badge={b} />
      ))}
    </div>
  )
}

function BadgeCard({ badge }: { badge: { id: string; name: string; description: string; icon: string; tier: BadgeTier; earned: boolean; earnedAt: string | null; progress: number } }) {
  const IconC = (Icon as any)[badge.icon] ?? Icon.Eval
  const tier = TIER_META[badge.tier]
  const locked = !badge.earned && badge.progress === 0

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border p-4 text-center transition',
        locked
          ? 'border-paper-line bg-paper-surface'
          : 'border-paper-line bg-paper-raised shadow-paper-1 hover:shadow-paper-2',
      )}
    >
      <div
        className="mb-2.5 grid h-14 w-14 place-items-center rounded-full"
        style={{
          background: locked ? 'hsl(var(--paper-line-soft))' : tier.bg,
          border: locked ? 'none' : `2px solid ${tier.border}`,
          color: locked ? 'hsl(var(--ink-muted))' : tier.ink,
          filter: locked ? 'grayscale(1)' : 'none',
        }}
      >
        <IconC size={24} />
      </div>
      <div className={cn('font-serif text-[14px] leading-tight', locked ? 'text-ink-3' : 'text-ink')}>
        {badge.name}
      </div>
      <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.4px] text-ink-3">
        {tier.label}
      </div>
      <div className="mt-1.5 line-clamp-2 text-[11px] leading-[1.4] text-ink-3">
        {badge.description}
      </div>
      {!badge.earned && badge.progress > 0 && (
        <div className="mt-2.5 w-full">
          <div className="h-1 overflow-hidden rounded-full bg-paper-line-soft">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
          <div className="mt-1 font-mono text-[9.5px] text-ink-3">{badge.progress}%</div>
        </div>
      )}
      {badge.earned && badge.earnedAt && (
        <div className="mt-2 font-mono text-[9.5px] text-ink-3">
          {new Date(badge.earnedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  )
}

function formatRel(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const h = Math.floor(diffMs / 3_600_000)
  if (h < 24) return `hace ${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `hace ${days}d`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
