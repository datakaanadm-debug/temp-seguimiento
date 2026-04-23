'use client'

import { useState } from 'react'
import { Icon, type IconName } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

type Badge = {
  id: string
  name: string
  description: string
  icon: IconName
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  earned?: boolean
  earnedAt?: string
  progress?: number // 0-100 si no ganado
}

const BADGES: Badge[] = [
  { id: 'b1', name: 'Primer día', description: 'Completaste tu onboarding inicial.', icon: 'Onboard', tier: 'bronze', earned: true, earnedAt: '15 feb' },
  { id: 'b2', name: 'Puntualidad 7 días', description: '7 días consecutivos reportando a tiempo.', icon: 'Clock', tier: 'silver', earned: true, earnedAt: '22 feb' },
  { id: 'b3', name: 'Puntualidad 30 días', description: '30 días consecutivos con bitácora al día.', icon: 'Clock', tier: 'gold', earned: false, progress: 72 },
  { id: 'b4', name: 'Primer proyecto', description: 'Entregaste tu primer proyecto completo.', icon: 'Check', tier: 'silver', earned: true, earnedAt: '10 mar' },
  { id: 'b5', name: 'Feedback ejemplar', description: 'Recibiste feedback sobresaliente en evaluación 30d.', icon: 'Sparkles', tier: 'gold', earned: true, earnedAt: '20 mar' },
  { id: 'b6', name: 'Mentor certificado', description: 'Ayudaste a onboardear a un practicante nuevo.', icon: 'Mentor', tier: 'gold', earned: false, progress: 45 },
  { id: 'b7', name: 'Master collaborator', description: '50+ comentarios constructivos en tareas.', icon: 'People', tier: 'silver', earned: false, progress: 68 },
  { id: 'b8', name: 'OKR master', description: 'Completaste todos los OKRs de un trimestre.', icon: 'Flag', tier: 'platinum', earned: false, progress: 33 },
  { id: 'b9', name: 'Racha 90 días', description: '90 días con actividad continua.', icon: 'Cal', tier: 'platinum', earned: false, progress: 21 },
  { id: 'b10', name: 'Zero bloqueos', description: 'Un mes sin reportar bloqueos.', icon: 'Check', tier: 'gold', earned: true, earnedAt: '1 abr' },
  { id: 'b11', name: 'Speed runner', description: '10 tareas completadas por debajo de su estimado.', icon: 'Sparkles', tier: 'silver', earned: true, earnedAt: '5 abr' },
  { id: 'b12', name: 'Legacy intern', description: 'Completaste tu programa y fuiste contratado.', icon: 'Eval', tier: 'platinum', earned: false, progress: 0 },
]

const LEADERBOARD = [
  { id: 'u1', name: 'Valentina Cruz', score: 1420, streak: 21, badges: 8, area: 'Diseño' },
  { id: 'u2', name: 'Ana Paredes', score: 1180, streak: 14, badges: 6, area: 'Producto' },
  { id: 'u3', name: 'Camila Rojas', score: 970, streak: 9, badges: 5, area: 'Ingeniería' },
  { id: 'u4', name: 'Diego Herrera', score: 820, streak: 3, badges: 4, area: 'Ingeniería' },
  { id: 'u5', name: 'Joaquín Peña', score: 660, streak: 5, badges: 3, area: 'Operaciones' },
  { id: 'u6', name: 'Mateo Ibáñez', score: 410, streak: 0, badges: 2, area: 'Marketing' },
]

const WALL = [
  { id: 'w1', name: 'Valentina Cruz', badge: 'Zero bloqueos', time: 'hace 2h', tier: 'gold' },
  { id: 'w2', name: 'Ana Paredes', badge: 'Puntualidad 30 días', time: 'ayer', tier: 'gold' },
  { id: 'w3', name: 'Camila Rojas', badge: 'Primer proyecto', time: 'hace 2d', tier: 'silver' },
  { id: 'w4', name: 'Diego Herrera', badge: 'Speed runner', time: 'hace 3d', tier: 'silver' },
]

const TIER_META = {
  bronze: { label: 'Bronce', bg: 'hsl(28 48% 88%)', ink: 'hsl(28 55% 35%)', border: 'hsl(28 48% 70%)' },
  silver: { label: 'Plata', bg: 'hsl(210 10% 90%)', ink: 'hsl(210 10% 35%)', border: 'hsl(210 10% 75%)' },
  gold: { label: 'Oro', bg: 'hsl(43 71% 85%)', ink: 'hsl(39 63% 28%)', border: 'hsl(43 63% 65%)' },
  platinum: { label: 'Platino', bg: 'hsl(194 21% 88%)', ink: 'hsl(199 28% 25%)', border: 'hsl(199 28% 70%)' },
} as const

type View = 'mine' | 'catalog' | 'rankings'

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'mine', label: 'Mis logros' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'rankings', label: 'Rankings' },
]

export default function LogrosPage() {
  const [view, setView] = useState<View>('mine')
  const earned = BADGES.filter((b) => b.earned)
  const inProgress = BADGES.filter((b) => !b.earned && (b.progress ?? 0) > 0)

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Gamificación"
        title="Logros y reconocimientos"
        sub={`${earned.length} de ${BADGES.length} desbloqueados · racha actual 21 días`}
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

      {view === 'mine' && (
        <>
          {/* Level + streak */}
          <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <PaperCard>
              <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                Nivel actual
              </div>
              <div className="mt-2 font-serif text-[32px] leading-none tracking-tight text-ink">
                Mid
              </div>
              <div className="mt-1 text-[12px] text-ink-3">Practicante Mid · 4 de 6 hitos</div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-paper-line-soft">
                <div className="h-full rounded-full bg-primary" style={{ width: '66%' }} />
              </div>
            </PaperCard>
            <PaperCard>
              <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                Racha bitácora
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-serif text-[32px] leading-none tracking-tight text-ink">
                  21
                </span>
                <span className="text-[13px] text-ink-3">días</span>
                <span className="ml-auto text-[22px]">🔥</span>
              </div>
              <div className="mt-1 text-[12px] text-ink-3">Tu mejor racha es 28. ¡Sigue así!</div>
            </PaperCard>
            <PaperCard>
              <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                Puntos totales
              </div>
              <div className="mt-2 font-serif text-[32px] leading-none tracking-tight text-ink">
                1,420
              </div>
              <PaperBadge tone="accent" className="mt-2.5 !text-[10px]">
                #1 del equipo
              </PaperBadge>
            </PaperCard>
          </div>

          {/* Desbloqueados */}
          <div className="mb-6">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
              Desbloqueados · {earned.length}
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
            >
              {earned.map((b) => (
                <BadgeCard key={b.id} badge={b} />
              ))}
            </div>
          </div>

          {/* En progreso */}
          {inProgress.length > 0 && (
            <div>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                En progreso · {inProgress.length}
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
              >
                {inProgress.map((b) => (
                  <BadgeCard key={b.id} badge={b} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'catalog' && (
        <div>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
            Catálogo completo · {BADGES.length} badges
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
          >
            {BADGES.map((b) => (
              <BadgeCard key={b.id} badge={b} />
            ))}
          </div>
        </div>
      )}

      {view === 'rankings' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
          <PaperCard title="Leaderboard · este mes" noPad>
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
            {LEADERBOARD.map((u, i) => (
              <div
                key={u.id}
                className={cn(
                  'grid items-center gap-3 px-4 py-3 text-[13px]',
                  i < LEADERBOARD.length - 1 && 'border-b border-paper-line-soft',
                )}
                style={{ gridTemplateColumns: '32px 1fr 70px 70px 60px' }}
              >
                <span className="font-mono text-[11px] text-ink-3">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="flex min-w-0 items-center gap-2.5">
                  <TonalAvatar size={28} name={u.name} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{u.name}</div>
                    <div className="text-[11px] text-ink-3">{u.area}</div>
                  </div>
                </div>
                <span className="font-mono font-semibold">{u.score.toLocaleString()}</span>
                <span className="font-mono text-ink-2">
                  {u.streak > 0 ? `🔥 ${u.streak}` : '—'}
                </span>
                <span className="text-right font-mono">{u.badges}</span>
              </div>
            ))}
          </PaperCard>

          <PaperCard title="Muro de logros" right={<PaperBadge tone="accent">vivo</PaperBadge>}>
            <div className="-my-2">
              {WALL.map((w, i) => {
                const tierMeta = TIER_META[w.tier as keyof typeof TIER_META]
                return (
                  <div
                    key={w.id}
                    className={cn(
                      'flex items-start gap-2.5 py-2.5',
                      i > 0 && 'border-t border-paper-line-soft',
                    )}
                  >
                    <TonalAvatar size={32} name={w.name} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] leading-[1.45] text-ink-2">
                        <b className="text-ink">{w.name.split(' ')[0]}</b> desbloqueó{' '}
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold"
                          style={{ background: tierMeta.bg, color: tierMeta.ink }}
                        >
                          {w.badge}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-3">{w.time}</div>
                    </div>
                    <span className="text-lg">🎉</span>
                  </div>
                )
              })}
            </div>
          </PaperCard>
        </div>
      )}
    </div>
  )
}

function BadgeCard({ badge }: { badge: Badge }) {
  const IconC = Icon[badge.icon]
  const tier = TIER_META[badge.tier]
  const locked = !badge.earned
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
      <div
        className={cn(
          'font-serif text-[14px] leading-tight',
          locked ? 'text-ink-3' : 'text-ink',
        )}
      >
        {badge.name}
      </div>
      <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.4px] text-ink-3">
        {tier.label}
      </div>
      <div className="mt-1.5 line-clamp-2 text-[11px] leading-[1.4] text-ink-3">
        {badge.description}
      </div>
      {locked && badge.progress != null && badge.progress > 0 && (
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
      {!locked && badge.earnedAt && (
        <div className="mt-2 font-mono text-[9.5px] text-ink-3">{badge.earnedAt}</div>
      )}
    </div>
  )
}
