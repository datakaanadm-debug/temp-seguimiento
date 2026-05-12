'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { PaperCard, SectionTitle } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { FlowDiagram } from './flow-diagram'
import { RoleBadgeRow } from './role-badge'
import type { GuideModule } from '../data/modules'

const ACCENT_STYLES: Record<
  GuideModule['accent'],
  { ring: string; glow: string; iconBg: string; iconColor: string }
> = {
  amber: {
    ring: 'ring-amber-200 dark:ring-amber-700/30',
    glow: 'from-amber-100 to-transparent dark:from-amber-900/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-700 dark:text-amber-300',
  },
  sky: {
    ring: 'ring-sky-200 dark:ring-sky-700/30',
    glow: 'from-sky-100 to-transparent dark:from-sky-900/20',
    iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    iconColor: 'text-sky-700 dark:text-sky-300',
  },
  rose: {
    ring: 'ring-rose-200 dark:ring-rose-700/30',
    glow: 'from-rose-100 to-transparent dark:from-rose-900/20',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-700 dark:text-rose-300',
  },
  violet: {
    ring: 'ring-violet-200 dark:ring-violet-700/30',
    glow: 'from-violet-100 to-transparent dark:from-violet-900/20',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-700 dark:text-violet-300',
  },
  emerald: {
    ring: 'ring-emerald-200 dark:ring-emerald-700/30',
    glow: 'from-emerald-100 to-transparent dark:from-emerald-900/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
  },
  lime: {
    ring: 'ring-lime-200 dark:ring-lime-700/30',
    glow: 'from-lime-100 to-transparent dark:from-lime-900/20',
    iconBg: 'bg-lime-100 dark:bg-lime-900/30',
    iconColor: 'text-lime-700 dark:text-lime-300',
  },
  orange: {
    ring: 'ring-orange-200 dark:ring-orange-700/30',
    glow: 'from-orange-100 to-transparent dark:from-orange-900/20',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-700 dark:text-orange-300',
  },
}

export function ModuleDetail({ module: m }: { module: GuideModule }) {
  const accent = ACCENT_STYLES[m.accent]
  const IconC = Icon[m.icon]

  return (
    <div className="space-y-6 pb-12">
      {/* Hero card con icono grande + summary */}
      <div className={cn('relative overflow-hidden rounded-xl border border-paper-line bg-paper-raised p-6 ring-1', accent.ring)}>
        <div className={cn('absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br opacity-50', accent.glow)} />
        <div className="relative flex items-start gap-5">
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl', accent.iconBg, accent.iconColor)}>
            <IconC size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
              Módulo
            </div>
            <h1 className="mt-1 font-serif text-[30px] font-normal leading-[1.1] tracking-tight text-ink">
              {m.name}
            </h1>
            <p className="mt-2 max-w-prose text-[14px] leading-[1.6] text-ink-2">
              {m.summary}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-ink-3">
                Para
              </span>
              <RoleBadgeRow roles={m.roles} />
            </div>
            <Link
              href={m.appPath}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[12.5px] font-medium text-paper-surface transition hover:bg-ink-2"
            >
              Ir al módulo
              <Icon.Chev size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* Flow + Use cases en grilla */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <PaperCard title="Flujo paso a paso">
          <FlowDiagram steps={m.flow} />
        </PaperCard>

        <PaperCard title="Cuándo usarlo">
          <ul className="space-y-3">
            {m.useCases.map((uc, i) => (
              <li key={i} className="rounded-md border border-paper-line-soft bg-paper-bg-2 p-3">
                <div className="text-[13px] font-semibold text-ink">{uc.title}</div>
                <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-2">{uc.description}</p>
              </li>
            ))}
          </ul>
        </PaperCard>
      </div>

      {/* Tips */}
      <PaperCard title="Tips & gotchas">
        <ul className="space-y-2">
          {m.tips.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-[12.5px] leading-[1.55] text-ink-2">
              <span
                className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: 'hsl(var(--accent-h))' }}
              />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </PaperCard>
    </div>
  )
}

/**
 * Card de módulo para el grid del index — variante compacta con icono,
 * nombre, summary truncado, roles y CTA "Leer guía →".
 */
export function ModuleCard({ module: m }: { module: GuideModule }) {
  const accent = ACCENT_STYLES[m.accent]
  const IconC = Icon[m.icon]

  return (
    <Link
      href={`/guia/${m.slug}`}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-paper-line bg-paper-raised p-4 ring-1 transition-all hover:-translate-y-0.5 hover:shadow-paper-2',
        accent.ring,
      )}
    >
      <div className={cn('absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-80', accent.glow)} />
      <div className="relative">
        <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-lg', accent.iconBg, accent.iconColor)}>
          <IconC size={20} />
        </div>
        <div className="text-[14px] font-semibold text-ink">{m.name}</div>
        <p className="mt-1 line-clamp-3 text-[12px] leading-[1.5] text-ink-3">
          {m.summary}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.4px] text-ink-3">
            {m.flow.length} pasos
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-ink-2 transition-transform group-hover:translate-x-0.5">
            Leer guía
            <Icon.Chev size={10} />
          </span>
        </div>
      </div>
    </Link>
  )
}
