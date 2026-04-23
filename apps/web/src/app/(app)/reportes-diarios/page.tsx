'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge, TonalAvatar } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useDailyReports } from '@/features/tracking/hooks/use-daily-report'
import { cn } from '@/lib/utils'
import type { DailyReport } from '@/types/api'

const MOOD_EMOJI: Record<string, string> = {
  great: '🤩',
  good: '😊',
  ok: '🙂',
  stressed: '😐',
  blocked: '😕',
}

const MOOD_LABEL: Record<string, string> = {
  great: 'Excelente',
  good: 'Bien',
  ok: 'Ok',
  stressed: 'Estresado',
  blocked: 'Bloqueado',
}

export default function ReportesDiariosPage() {
  const { data, isLoading } = useDailyReports({ per_page: 50 })
  const reports = data?.data ?? []

  const heatmap = useMemo(() => buildHeatmap(reports, 14), [reports])

  return (
    <div className="mx-auto max-w-[980px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Bitácora"
        title="Reportes diarios"
        sub={`${reports.length} entradas · ${reports.filter((r) => r.status === 'submitted').length} enviadas`}
        right={
          <Link
            href="/reportes-diarios/hoy"
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
          >
            <Icon.Plus size={13} />
            Nueva entrada
          </Link>
        }
      />

      {/* Heatmap de los últimos 14 días */}
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
          Entradas anteriores · últimos 14 días
        </div>
        <div className="flex gap-1">
          {heatmap.map((cell, i) => (
            <span
              key={i}
              title={
                cell.report
                  ? `${cell.date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}${cell.report.hours_worked ? ` · ${cell.report.hours_worked}h` : ''}`
                  : cell.date.toLocaleDateString('es-MX')
              }
              className={cn(
                'h-[18px] w-3 rounded-[2px]',
                cell.report ? 'bg-primary' : 'border border-paper-line bg-paper-surface',
              )}
              style={{ opacity: cell.intensity }}
            />
          ))}
        </div>
      </div>

      {/* Historial */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
          <p className="text-[13px] text-ink-3">
            No hay reportes aún. Escribe el de hoy para empezar.
          </p>
          <Link
            href="/reportes-diarios/hoy"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
          >
            <Icon.Plus size={13} />
            Escribir reporte
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <EntryCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function EntryCard({ report }: { report: DailyReport }) {
  const date = new Date(report.report_date)
  const day = date.getDate().toString()
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'short' })
  const month = date.toLocaleDateString('es-MX', { month: 'short' })

  const bulletsFromText = (text: string | null | undefined) => {
    if (!text) return []
    return text
      .split('\n')
      .map((s) => s.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean)
  }

  const progress = bulletsFromText(report.progress_summary)
  const plan = bulletsFromText(report.plan_tomorrow)
  const blockers = bulletsFromText(report.blockers_text)

  return (
    <Link
      href={`/reportes-diarios/${report.id}`}
      className="grid gap-5 rounded-lg border border-paper-line bg-paper-raised p-[18px] shadow-paper-1 transition hover:border-paper-line-soft"
      style={{ gridTemplateColumns: '90px 1fr' }}
    >
      {/* Date column */}
      <div>
        <div className="font-serif text-[22px] leading-none text-ink">{day}</div>
        <div className="font-mono text-[11px] uppercase tracking-[0.5px] text-ink-3">
          {weekday} {month}
        </div>
        <div className="mt-2.5 space-y-0.5 text-[11px] text-ink-2">
          {report.hours_worked != null && <div>⏱ {report.hours_worked}h</div>}
          {report.mood && (
            <div>
              {MOOD_EMOJI[report.mood]} {MOOD_LABEL[report.mood]}
            </div>
          )}
          {report.user && (
            <div className="mt-2 flex items-center gap-1.5">
              <TonalAvatar size={16} name={report.user.name ?? report.user.email} />
              <span className="truncate text-[11px] text-ink-3">
                {report.user.name?.split(' ')[0] ?? report.user.email}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content column */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <StatusPill status={report.status} />
          {report.ai_summary_id && (
            <PaperBadge tone="info" className="!text-[10px]">
              <Icon.Sparkles size={9} className="mr-1" /> Resumen IA
            </PaperBadge>
          )}
        </div>

        {progress.length > 0 && (
          <>
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-3">
              Avances
            </div>
            <ul className="mb-2.5 space-y-0.5 pl-5 text-[13px] leading-[1.55] text-ink">
              {progress.slice(0, 4).map((d, i) => (
                <li key={i} className="list-disc">
                  {d}
                </li>
              ))}
              {progress.length > 4 && (
                <li className="list-none text-[11px] text-ink-3">
                  + {progress.length - 4} más
                </li>
              )}
            </ul>
          </>
        )}

        {plan.length > 0 && (
          <>
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-3">
              Próximos pasos
            </div>
            <ul className="mb-2.5 space-y-0.5 pl-5 text-[13px] leading-[1.55] text-ink-2">
              {plan.slice(0, 3).map((d, i) => (
                <li key={i} className="list-disc">
                  {d}
                </li>
              ))}
            </ul>
          </>
        )}

        {blockers.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-destructive-soft px-2.5 py-2 text-[12.5px] text-destructive">
            <Icon.Flag size={13} className="mt-0.5 shrink-0" />
            <span>{blockers.join(' · ')}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: 'neutral' | 'ok' | 'info' | 'warn' }> = {
    draft: { label: 'Borrador', tone: 'neutral' },
    submitted: { label: 'Enviado', tone: 'info' },
    reviewed: { label: 'Revisado', tone: 'ok' },
  }
  const meta = map[status] ?? { label: status, tone: 'neutral' as const }
  return <PaperBadge tone={meta.tone}>{meta.label}</PaperBadge>
}

function buildHeatmap(reports: DailyReport[], days: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cells: Array<{ date: Date; report?: DailyReport; intensity: number }> = []
  const byDate = new Map<string, DailyReport>()
  for (const r of reports) {
    const k = r.report_date.slice(0, 10)
    byDate.set(k, r)
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const r = byDate.get(key)
    const hours = r?.hours_worked ?? 0
    const intensity = r ? Math.min(1, 0.3 + (hours / 8) * 0.7) : 0.3
    cells.push({ date: d, report: r, intensity })
  }
  return cells
}
