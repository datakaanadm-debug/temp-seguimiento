'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Icon, type IconName } from '@/components/ui/icon'
import { useAuth } from '@/providers/auth-provider'

interface AwardedBadge {
  slug: string
  name: string
  description: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  user_id: string
}

/**
 * Paleta visual por tier. Espejo del catálogo en /logros para mantener
 * coherencia entre el toast y la card de la badge desbloqueada.
 */
const TIER_VISUAL = {
  bronze: {
    label: 'Bronce',
    emoji: '🥉',
    bg: 'hsl(28 48% 88%)',
    border: 'hsl(28 48% 70%)',
    ink: 'hsl(28 55% 35%)',
    confettiColors: ['#cd7f32', '#deb887', '#a0522d'],
  },
  silver: {
    label: 'Plata',
    emoji: '🥈',
    bg: 'hsl(210 10% 90%)',
    border: 'hsl(210 10% 75%)',
    ink: 'hsl(210 10% 35%)',
    confettiColors: ['#c0c0c0', '#dcdcdc', '#a9a9a9'],
  },
  gold: {
    label: 'Oro',
    emoji: '🥇',
    bg: 'hsl(43 71% 85%)',
    border: 'hsl(43 63% 65%)',
    ink: 'hsl(39 63% 28%)',
    confettiColors: ['#ffd700', '#ffb700', '#ffec8b'],
  },
  platinum: {
    label: 'Platino',
    emoji: '💎',
    bg: 'hsl(194 21% 88%)',
    border: 'hsl(199 28% 70%)',
    ink: 'hsl(199 28% 25%)',
    confettiColors: ['#7fbfd9', '#b0e0e6', '#5cabd9', '#ffd700'],
  },
} as const

/**
 * Dispara confetti centrado-arriba con la paleta del tier.
 * Más intenso para tiers superiores.
 */
function fireConfetti(tier: AwardedBadge['tier']) {
  const intensity = tier === 'platinum' ? 1.4 : tier === 'gold' ? 1.1 : 0.8
  const colors = TIER_VISUAL[tier].confettiColors as unknown as string[]

  // Burst central
  confetti({
    particleCount: Math.round(80 * intensity),
    spread: 70,
    origin: { y: 0.3, x: 0.5 },
    colors,
    scalar: 0.9,
    ticks: 200,
  })

  // Side bursts solo para gold/platinum
  if (intensity > 1) {
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      })
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      })
    }, 250)
  }
}

interface BadgeToastCardProps {
  badge: AwardedBadge
  toastId: string | number
}

function BadgeToastCard({ badge, toastId }: BadgeToastCardProps) {
  const visual = TIER_VISUAL[badge.tier]
  const IconC =
    (Icon as Record<string, React.ComponentType<{ size?: number }>>)[badge.icon as IconName]
    ?? Icon.Sparkles

  return (
    <div
      className="relative flex w-[340px] items-start gap-3 overflow-hidden rounded-lg border bg-paper-raised p-3.5 shadow-paper-2"
      style={{ borderColor: visual.border }}
    >
      {/* Tira de color por tier */}
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: visual.ink }}
      />
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
        style={{
          background: visual.bg,
          color: visual.ink,
          border: `2px solid ${visual.border}`,
        }}
      >
        <IconC size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.6px]"
          style={{ color: visual.ink }}
        >
          {visual.emoji} Badge desbloqueada · {visual.label}
        </div>
        <div className="mt-0.5 font-serif text-[16px] leading-tight text-ink">
          {badge.name}
        </div>
        <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink-2">
          {badge.description}
        </div>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 font-mono text-[10.5px] font-semibold text-success">
          +{badge.points} puntos
        </div>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(toastId)}
        className="text-ink-3 hover:text-ink"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

/**
 * Escucha el evento global `gamification:awards` (disparado por api-client
 * cuando el backend inyecta `_awarded_badges` en la respuesta).
 *
 * Por cada badge nueva del usuario actual:
 *   1. Confetti con paleta del tier.
 *   2. Toast custom con tarjeta visual (color por tier, icono, +pts).
 *   3. Invalida queries de gamification (`/logros` se refresca al volver).
 *
 * Si la badge es de otro user (ej. mentor-cert otorgado al mentor cuando un
 * líder asignó un practicante), solo invalida leaderboard/wall — no spam.
 */
export function AwardedBadgeListener() {
  const qc = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const onAwards = (e: Event) => {
      const ce = e as CustomEvent<AwardedBadge[]>
      const awards = Array.isArray(ce.detail) ? ce.detail : []

      const mine = awards.filter((a) => a.user_id === user.id)
      if (mine.length === 0) {
        qc.invalidateQueries({ queryKey: ['gamif-leaderboard'] })
        qc.invalidateQueries({ queryKey: ['gamif-wall'] })
        return
      }

      // Confetti del tier más alto recibido (no spammear si son varias)
      const highestTier = mine.reduce<AwardedBadge['tier']>((acc, b) => {
        const order = { bronze: 0, silver: 1, gold: 2, platinum: 3 } as const
        return order[b.tier] > order[acc] ? b.tier : acc
      }, 'bronze')
      fireConfetti(highestTier)

      mine.forEach((badge, i) => {
        toast.custom(
          (id) => <BadgeToastCard badge={badge} toastId={id} />,
          {
            duration: 7000 + i * 600,
            // stagger: la siguiente toast aparece un poco después
          },
        )
      })

      qc.invalidateQueries({ queryKey: ['gamif-stats'] })
      qc.invalidateQueries({ queryKey: ['gamif-user-badges'] })
      qc.invalidateQueries({ queryKey: ['gamif-leaderboard'] })
      qc.invalidateQueries({ queryKey: ['gamif-wall'] })
    }

    window.addEventListener('gamification:awards', onAwards)
    return () => window.removeEventListener('gamification:awards', onAwards)
  }, [qc, user?.id])

  return null
}
