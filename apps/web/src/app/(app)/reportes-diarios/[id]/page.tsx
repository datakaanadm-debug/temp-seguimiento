'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import {
  PaperBadge,
  PaperCard,
  SectionTitle,
  TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getDailyReport,
  listDailyReportAttachments,
  reviewDailyReport,
} from '@/features/tracking/api/tracking'
import { useAuth } from '@/providers/auth-provider'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  reviewed: 'Revisada',
}

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'ok'> = {
  draft: 'neutral',
  submitted: 'info',
  reviewed: 'ok',
}

const MOOD_LABEL: Record<string, string> = {
  great: '✨ Excelente',
  good: '🙂 Bien',
  ok: '😐 Normal',
  stressed: '😰 Con estrés',
  blocked: '🚧 Bloqueado',
}

/**
 * Vista detalle de una bitácora histórica. Antes esta ruta no existía y
 * todos los cards del historial enlazaban a `/reportes-diarios/{id}` → 404.
 *
 * Modo lectura: hoy solo muestra. Editar la bitácora pasada queda fuera
 * de scope porque la UX habitual es "edita la de hoy desde /hoy".
 *
 * Acciones disponibles:
 *  - Si el report está submitted y el actor es mentor/lead/HR/admin con
 *    visibilidad, puede marcarla como "reviewed" (POST /review).
 *  - Volver al historial.
 */
export default function DailyReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: reportData, isLoading, isError } = useQuery({
    queryKey: ['daily-report', id],
    queryFn: () => getDailyReport(id),
    enabled: !!id,
  })
  const report = reportData?.data

  const { data: attachmentsData } = useQuery({
    queryKey: ['daily-report-attachments', id],
    queryFn: () => listDailyReportAttachments(id),
    enabled: !!id && !!report,
  })
  const attachments = attachmentsData?.data ?? []

  const review = useMutation({
    mutationFn: () => reviewDailyReport(id),
    onSuccess: () => {
      toast.success('Bitácora marcada como revisada')
      qc.invalidateQueries({ queryKey: ['daily-report', id], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['daily-reports'], refetchType: 'all' })
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'No se pudo marcar como revisada')
    },
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[920px] px-7 py-5 pb-10">
        <Skeleton className="mb-3 h-5 w-40" />
        <Skeleton className="mb-6 h-12 w-2/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="mx-auto max-w-[920px] px-7 py-16 text-center">
        <Icon.Log size={28} className="mx-auto mb-3 text-ink-3" />
        <div className="font-serif text-[18px] text-ink">Bitácora no encontrada</div>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-3">
          La entrada que buscas no existe, fue eliminada, o no tienes permiso
          para verla.
        </p>
        <Link
          href="/reportes-diarios"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-3 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
        >
          <Icon.Chev size={11} className="rotate-180" /> Volver al historial
        </Link>
      </div>
    )
  }

  const date = new Date(report.report_date)
  const dateLabel = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  })

  // Quien puede marcar como reviewed: mentor/team_lead/hr/admin que NO sea
  // el autor. El backend valida igual; este gate es para esconder el botón.
  const isAuthor = report.user_id === user?.id
  const canReview =
    !isAuthor &&
    report.status === 'submitted' &&
    user?.role &&
    ['tenant_admin', 'hr', 'team_lead', 'mentor'].includes(user.role)

  return (
    <div className="mx-auto max-w-[920px] px-7 py-5 pb-10">
      <Link
        href="/reportes-diarios"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Historial de bitácoras
      </Link>

      <SectionTitle
        kicker={`Bitácora · ${dateLabel}`}
        title={
          <span className="capitalize">
            {date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        }
        sub={
          <span className="flex items-center gap-2">
            <PaperBadge tone={STATUS_TONE[report.status] ?? 'neutral'}>
              {STATUS_LABEL[report.status] ?? report.status}
            </PaperBadge>
            {report.hours_worked != null && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                <Icon.Clock size={11} />
                {report.hours_worked}h
              </span>
            )}
            {report.mood && (
              <span className="text-[12px] text-ink-3">
                {MOOD_LABEL[report.mood] ?? report.mood}
              </span>
            )}
          </span>
        }
        right={
          canReview ? (
            <button
              type="button"
              onClick={() => review.mutate()}
              disabled={review.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              <Icon.Check size={13} />
              {review.isPending ? 'Marcando…' : 'Marcar como revisada'}
            </button>
          ) : null
        }
      />

      {/* Autor */}
      {report.user && (
        <PaperCard className="mb-4">
          <div className="flex items-center gap-3">
            <TonalAvatar size={36} name={report.user.name ?? report.user.email ?? '?'} />
            <div>
              <div className="text-[13px] font-medium text-ink">{report.user.name ?? report.user.email}</div>
              <div className="text-[11px] text-ink-3">
                {report.submitted_at
                  ? `Enviada ${new Date(report.submitted_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' })}`
                  : 'Sin enviar'}
              </div>
            </div>
          </div>
        </PaperCard>
      )}

      {/* Avance */}
      <PaperCard title="¿Qué avanzaste?" className="mb-4">
        {report.progress_summary?.trim() ? (
          <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.65] text-ink-2">
            {report.progress_summary}
          </p>
        ) : (
          <p className="text-[12.5px] italic text-ink-3">Sin avances registrados.</p>
        )}
      </PaperCard>

      {/* Plan */}
      <PaperCard title="Plan para mañana" className="mb-4">
        {report.plan_tomorrow?.trim() ? (
          <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.65] text-ink-2">
            {report.plan_tomorrow}
          </p>
        ) : (
          <p className="text-[12.5px] italic text-ink-3">Sin plan registrado.</p>
        )}
      </PaperCard>

      {/* Bloqueos */}
      <PaperCard title="Bloqueos" className="mb-4">
        {report.blockers_text?.trim() ? (
          <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.65] text-ink-2">
            {report.blockers_text}
          </p>
        ) : (
          <p className="text-[12.5px] italic text-ink-3">Sin bloqueos reportados.</p>
        )}
      </PaperCard>

      {/* Adjuntos */}
      {attachments.length > 0 && (
        <PaperCard title={`Adjuntos · ${attachments.length}`}>
          <div className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <a
                key={a.id}
                href={a.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-paper-line bg-paper-surface px-2.5 py-1.5 text-[12px] text-ink-2 hover:border-paper-line-soft hover:text-ink"
              >
                <Icon.Attach size={11} />
                <span className="truncate max-w-[200px]">{a.original_name}</span>
                <span className="font-mono text-[10px] text-ink-3">
                  {Math.round(a.size_bytes / 1024)} KB
                </span>
              </a>
            ))}
          </div>
        </PaperCard>
      )}
    </div>
  )
}
