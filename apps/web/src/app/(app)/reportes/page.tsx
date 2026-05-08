'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useReportRuns, useReportTemplates, useRequestReport } from '@/features/reports/hooks/use-reports'
import { getDownloadUrl } from '@/features/reports/api/reports'
import { formatBytes, cn } from '@/lib/utils'
import type { ReportTemplate, RunStatus } from '@/types/api'

const STATUS_TONE: Record<RunStatus, 'neutral' | 'info' | 'accent' | 'warn' | 'ok' | 'danger'> = {
  queued: 'neutral',
  running: 'accent',
  completed: 'ok',
  failed: 'danger',
  expired: 'neutral',
}
const STATUS_LABEL: Record<RunStatus, string> = {
  queued: 'En cola',
  running: 'Generando…',
  completed: 'Listo',
  failed: 'Falló',
  expired: 'Expirado',
}

const KIND_ICON: Record<string, keyof typeof Icon> = {
  executive: 'Analytics',
  team: 'People',
  intern: 'Mentor',
  university: 'Onboard',
  custom: 'Settings',
}

export default function ReportesPage() {
  const { data: runsData, isLoading: runsLoading } = useReportRuns({ mine: false })
  const { data: templatesData, isLoading: templatesLoading } = useReportTemplates()
  const runs = runsData?.data ?? []
  // total: conteo REAL en BD (paginated meta), no solo lo que cabe en la página.
  const totalRuns = runsData?.meta?.total ?? runs.length
  const templates = templatesData?.data ?? []

  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const requestMutation = useRequestReport()

  const handleGenerate = async (template: ReportTemplate) => {
    // Templates que requieren elegir subject + período — redirigimos al
    // form dedicado en vez de POSTear sin parámetros (failure garantizado
    // o reporte vacío).
    if (template.kind === 'university') {
      window.location.href = '/reportes/universidad/solicitar'
      return
    }
    if (template.kind === 'team') {
      window.location.href = '/reportes/equipo/solicitar'
      return
    }
    // Executive: no necesita subject. Generamos con período por defecto
    // (últimos 90 días) — el job aplica el fallback en buildData().
    setGeneratingId(template.id)
    try {
      // Hook centralizado: maneja optimistic insert + invalidate +
      // toast por status (completed/queued/failed) + 429/422 error code.
      await requestMutation.mutateAsync({ template_id: template.id })
    } catch {
      // Toast ya mostrado por onError del hook.
    } finally {
      setGeneratingId(null)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const { download_url } = await getDownloadUrl(id)
      window.open(download_url, '_blank')
    } catch {
      toast.error('No se pudo obtener el link de descarga.')
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Reportes ejecutivos"
        title="Genera y descarga reportes"
        sub={`${totalRuns} reportes generados · ${templates.length} plantillas disponibles`}
        right={
          <>
            <Link
              href="/reportes/universidad/solicitar"
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
            >
              <Icon.Onboard size={13} />
              Reporte universidad
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
              disabled
              title="Próximamente: builder personalizado"
            >
              <Icon.Plus size={13} />
              Reporte personalizado
            </button>
          </>
        }
      />

      {/* Plantillas grid */}
      <div className="mb-6">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
          Plantillas listas para generar
        </div>
        {templatesLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-10 text-center text-[13px] text-ink-3">
            Aún no hay plantillas. Crea o activa una desde Configuración.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {templates.map((t) => {
              const IconC = Icon[KIND_ICON[t.kind] ?? 'Analytics']
              return (
                <div
                  key={t.id}
                  className="group flex flex-col rounded-lg border border-paper-line bg-paper-raised p-3.5 transition hover:border-paper-line-soft hover:shadow-paper-2"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-ink">
                      <IconC size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">{t.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.4px] text-ink-3">
                        {t.kind_label ?? t.kind}
                      </div>
                    </div>
                    {t.is_system && (
                      <PaperBadge tone="neutral" className="!text-[9px]">
                        SISTEMA
                      </PaperBadge>
                    )}
                  </div>
                  <div className="mb-3 flex-1 text-[11.5px] leading-[1.45] text-ink-3">
                    {formatLayout(t.layout)}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-3">
                      {Object.keys(t.config ?? {}).length} parámetros
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGenerate(t)}
                      disabled={generatingId === t.id}
                      className="inline-flex items-center gap-1 rounded-md border border-paper-line bg-paper-surface px-2 py-[4px] text-[11px] font-medium text-ink-2 hover:border-paper-line-soft disabled:opacity-50"
                    >
                      {generatingId === t.id ? (
                        <>
                          <Icon.Sparkles size={10} />
                          Solicitando…
                        </>
                      ) : (
                        <>
                          <Icon.Download size={10} />
                          Generar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      <PaperCard
        title="Historial de generaciones"
        right={<span className="text-[11px] text-ink-3">{totalRuns} totales</span>}
        noPad
      >
        {runsLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-ink-3">
            Aún no has generado reportes.
          </div>
        ) : (
          <div>
            {runs.map((r, i) => (
              <div
                key={r.id}
                className={cn(
                  'grid items-center gap-3 px-4 py-3',
                  i < runs.length - 1 && 'border-b border-paper-line-soft',
                )}
                style={{ gridTemplateColumns: '1fr 140px 100px 120px' }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-ink">
                    {r.template?.name ?? 'Reporte sin plantilla'}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-ink-3">
                    {new Date(r.created_at).toLocaleString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                      timeZone: 'America/Mexico_City',
                    })}
                    {r.file_size_bytes && ` · ${formatBytes(r.file_size_bytes)}`}
                  </div>
                </div>
                <div>
                  <PaperBadge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</PaperBadge>
                </div>
                <div className="text-right font-mono text-[10.5px] text-ink-3">
                  {r.format?.toUpperCase() ?? 'PDF'}
                </div>
                <div className="flex justify-end">
                  {r.status === 'completed' ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[4px] text-[11px] font-medium text-ink-2 hover:border-paper-line-soft"
                    >
                      <Icon.Download size={11} />
                      Descargar
                    </button>
                  ) : r.status === 'failed' ? (
                    <span className="text-[11px] text-destructive">Revisa logs</span>
                  ) : (
                    <span className="font-mono text-[11px] text-ink-muted">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PaperCard>
    </div>
  )
}

function formatLayout(layout: string | null | undefined) {
  if (!layout) return 'Layout por defecto'
  if (typeof layout === 'string' && layout.length > 80) {
    return layout.slice(0, 80) + '…'
  }
  return layout
}
