import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/** SectionTitle — paper style (mono kicker + serif title + sub + right slot). */
export function SectionTitle({
  kicker,
  title,
  sub,
  right,
  className,
}: {
  kicker?: string
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {kicker && (
          <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
            {kicker}
          </div>
        )}
        <h1 className="font-serif text-[30px] font-normal leading-[1.1] tracking-tight text-ink">
          {title}
        </h1>
        {sub && <div className="mt-1.5 text-[13px] text-ink-2">{sub}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  )
}

/** Paper card shell with optional header (title + right actions). */
export function PaperCard({
  title,
  right,
  children,
  className,
  innerClassName,
  noPad,
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  innerClassName?: string
  noPad?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-paper-line bg-paper-raised shadow-paper-1',
        className,
      )}
    >
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-paper-line-soft px-3.5 py-3">
          <div className="text-[13px] font-semibold text-ink">{title}</div>
          {right && <div className="flex items-center gap-1.5">{right}</div>}
        </div>
      )}
      <div className={cn(!noPad && 'p-4', innerClassName)}>{children}</div>
    </div>
  )
}

/** Badge / pill con tone paper (variants en palette warm). */
export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'ok'
  | 'warn'
  | 'danger'
  | 'info'
  | 'tag1'
  | 'tag2'
  | 'tag3'
  | 'tag4'

const TONE_CLASSES: Record<BadgeTone, { soft: string; solid: string }> = {
  neutral: { soft: 'bg-paper-line-soft text-ink-2', solid: 'bg-ink-2 text-paper-surface' },
  accent: { soft: 'bg-primary-soft text-primary-ink', solid: 'bg-primary text-primary-foreground' },
  ok: { soft: 'bg-success-soft text-success', solid: 'bg-success text-success-foreground' },
  warn: { soft: 'bg-warning-soft text-warning', solid: 'bg-warning text-warning-foreground' },
  danger: { soft: 'bg-destructive-soft text-destructive', solid: 'bg-destructive text-destructive-foreground' },
  info: { soft: 'bg-info-soft text-info', solid: 'bg-info text-white' },
  tag1: { soft: 'bg-tag-1-soft text-tag-1', solid: 'bg-tag-1 text-white' },
  tag2: { soft: 'bg-tag-2-soft text-tag-2', solid: 'bg-tag-2 text-white' },
  tag3: { soft: 'bg-tag-3-soft text-tag-3', solid: 'bg-tag-3 text-white' },
  tag4: { soft: 'bg-tag-4-soft text-tag-4', solid: 'bg-tag-4 text-white' },
}

export function PaperBadge({
  tone = 'neutral',
  solid,
  children,
  className,
}: {
  tone?: BadgeTone
  solid?: boolean
  children: ReactNode
  className?: string
}) {
  const t = TONE_CLASSES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-[1.5]',
        solid ? t.solid : t.soft,
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Avatar por iniciales con tono cromático personalizable. */
export function TonalAvatar({
  name,
  initials,
  tone,
  size = 24,
  className,
}: {
  name?: string | null
  initials?: string
  tone?: string
  size?: number
  className?: string
}) {
  const label = initials ?? deriveInitials(name)
  const t = tone ?? 'hsl(var(--accent-h))'
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `${t}22`,
        color: t,
        border: `1px solid ${t}55`,
        flex: 'none',
        letterSpacing: 0.3,
      }}
      aria-hidden
    >
      {label}
    </div>
  )
}

function deriveInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?'
}

/** Priority dot (high/med/low). */
export function PriorityDot({ p, className }: { p: 'high' | 'med' | 'low' | 'normal' | 'urgent'; className?: string }) {
  const color =
    p === 'urgent' || p === 'high'
      ? 'bg-destructive'
      : p === 'med' || p === 'normal'
        ? 'bg-warning'
        : 'bg-ink-muted'
  return <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', color, className)} />
}

/** Keyboard key label. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-paper-line border-b-2 bg-paper-raised px-1 font-mono text-[10.5px] tracking-wider text-ink-2',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Sparkline bar (mini chart). */
export function Spark({
  data,
  width = 60,
  height = 20,
  tone = 'hsl(var(--accent-h))',
}: {
  data: number[]
  width?: number
  height?: number
  tone?: string
}) {
  const max = Math.max(...data, 1)
  const bw = width / data.length
  return (
    <svg width={width} height={height} aria-hidden>
      {data.map((v, i) => {
        const bh = Math.max(1, (v / max) * (height - 2))
        return (
          <rect
            key={i}
            x={i * bw + 1}
            y={height - bh}
            width={bw - 2}
            height={bh}
            rx={1}
            fill={tone}
            opacity={0.2 + 0.8 * (v / max)}
          />
        )
      })}
    </svg>
  )
}
