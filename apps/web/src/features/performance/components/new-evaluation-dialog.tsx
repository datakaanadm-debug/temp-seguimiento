'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { listScorecards, scheduleEvaluation } from '../api/performance'
import type { EvaluationKind, PaginatedResponse, Profile } from '@/types/api'

const KIND_OPTIONS: Array<{ value: EvaluationKind; label: string }> = [
  { value: '30d', label: '30 días — primer check-in' },
  { value: '60d', label: '60 días — revisión intermedia' },
  { value: '90d', label: '90 días — revisión de cierre' },
  { value: 'adhoc', label: 'Ad-hoc — sesión puntual' },
  { value: '360', label: '360° — feedback múltiple' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'offboarding', label: 'Offboarding / salida' },
]

/**
 * Dialog para programar una nueva evaluación. Antes el botón "Nueva
 * evaluación" en /evaluaciones era un Link href="/evaluaciones?new=true"
 * sin handler — totalmente ornamental.
 *
 * El backend espera: scorecard_id, subject_user_id, evaluator_user_id (opc),
 * kind, scheduled_for. POST /api/v1/evaluations.
 */
export function NewEvaluationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [scorecardId, setScorecardId] = useState('')
  const [subjectUserId, setSubjectUserId] = useState('')
  const [evaluatorUserId, setEvaluatorUserId] = useState('')
  const [kind, setKind] = useState<EvaluationKind>('30d')
  const [scheduledFor, setScheduledFor] = useState(
    new Date().toISOString().slice(0, 10), // default: hoy
  )

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setScorecardId('')
      setSubjectUserId('')
      setEvaluatorUserId('')
      setKind('30d')
      setScheduledFor(new Date().toISOString().slice(0, 10))
    }
  }, [open])

  // Scorecards activas — son las que el admin/HR habilita por tipo de evaluación
  const { data: scorecardsData, isLoading: scorecardsLoading } = useQuery({
    queryKey: ['scorecards-active'],
    queryFn: () => listScorecards({ active_only: true }),
    enabled: open,
  })
  const scorecards = scorecardsData?.data ?? []

  // Subjects = practicantes (para evaluaciones formales) + cualquier user del
  // tenant en el caso de 360. Cargamos todos los profiles para que admin/HR
  // puedan elegir, y filtramos a 'intern' por defecto si el kind es 30d/60d/90d.
  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles-for-evaluations', open],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
    enabled: open,
  })
  const allProfiles = profilesData?.data ?? []
  const subjects =
    kind === '360' || kind === 'adhoc'
      ? allProfiles
      : allProfiles.filter((p) => p.kind === 'intern')

  // Evaluators: staff con autoridad (mentor/team_lead/hr/admin/supervisor).
  const evaluators = allProfiles.filter(
    (p) => p.role && ['tenant_admin', 'hr', 'team_lead', 'mentor', 'supervisor'].includes(p.role),
  )

  const create = useMutation({
    mutationFn: () =>
      scheduleEvaluation({
        scorecard_id: scorecardId,
        subject_user_id: subjectUserId,
        evaluator_user_id: evaluatorUserId || null,
        kind,
        scheduled_for: scheduledFor,
      }),
    onSuccess: (res) => {
      toast.success('Evaluación programada')
      qc.invalidateQueries({ queryKey: ['evaluations'], refetchType: 'all' })
      onOpenChange(false)
      // Llevar al editor para que el evaluator empiece a responder.
      if (res?.data?.id) {
        router.push(`/evaluaciones/${res.data.id}`)
      }
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          const firstField = Object.keys(err.errors)[0]
          const firstMsg = firstField ? err.errors[firstField]?.[0] : err.message
          toast.error(firstMsg ?? err.message)
          return
        }
        toast.error(err.message)
        return
      }
      toast.error('No se pudo programar la evaluación')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scorecardId || !subjectUserId || !scheduledFor) return
    create.mutate()
  }

  const canSubmit =
    !!scorecardId && !!subjectUserId && !!scheduledFor && !create.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nueva evaluación</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-kind">Tipo de evaluación</Label>
            <select
              id="ev-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as EvaluationKind)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-scorecard">Scorecard</Label>
            <select
              id="ev-scorecard"
              value={scorecardId}
              onChange={(e) => setScorecardId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">
                {scorecardsLoading ? 'Cargando scorecards…' : '— Selecciona scorecard —'}
              </option>
              {scorecards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {!scorecardsLoading && scorecards.length === 0 && (
              <p className="text-[11px] text-ink-3">
                No hay scorecards activos. Crea uno en <b>/configuracion/scorecards</b>.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-subject">Evaluado</Label>
            <select
              id="ev-subject"
              value={subjectUserId}
              onChange={(e) => setSubjectUserId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">
                {profilesLoading ? 'Cargando…' : '— Selecciona persona —'}
              </option>
              {subjects.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.user?.name ?? p.user?.email}
                  {p.position_title ? ` · ${p.position_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-evaluator">
              Evaluador
              <span className="ml-2 font-mono text-[10px] text-ink-3">opcional</span>
            </Label>
            <select
              id="ev-evaluator"
              value={evaluatorUserId}
              onChange={(e) => setEvaluatorUserId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— sin asignar (puedes asignarlo después) —</option>
              {evaluators
                .filter((p) => p.user_id !== subjectUserId)
                .map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.user?.name ?? p.user?.email}
                    {p.role_label ? ` · ${p.role_label}` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-date">Fecha programada</Label>
            <Input
              id="ev-date"
              type="date"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <DialogFooter className="!flex-row !justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {create.isPending ? 'Programando…' : 'Programar evaluación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
