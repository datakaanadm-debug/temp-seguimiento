'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ApiError, apiClient } from '@/lib/api-client'
import { assignEvaluator } from '../api/performance'
import type { Evaluation, PaginatedResponse, Profile } from '@/types/api'

/**
 * Dialog para reasignar (o desasignar) el evaluador de una evaluación que
 * todavía está en SCHEDULED o IN_PROGRESS. Disponible para Admin/HR/TeamLead.
 */
export function AssignEvaluatorDialog({
  evaluation,
  open,
  onOpenChange,
}: {
  evaluation: Evaluation | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [evaluatorId, setEvaluatorId] = useState<string>('')

  useEffect(() => {
    if (open && evaluation) {
      setEvaluatorId(evaluation.evaluator_user_id ?? '')
    }
  }, [open, evaluation?.id, evaluation?.evaluator_user_id])

  // Staff con autoridad para evaluar. No incluimos al subject.
  const { data: profilesData, isLoading } = useQuery({
    queryKey: ['profiles-for-assign-evaluator', open],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
    enabled: open,
  })
  const allProfiles = profilesData?.data ?? []
  const evaluators = allProfiles.filter(
    (p) =>
      p.role
      && ['tenant_admin', 'hr', 'team_lead', 'mentor', 'supervisor'].includes(p.role)
      && p.user_id !== evaluation?.subject_user_id,
  )

  const mutation = useMutation({
    mutationFn: () => {
      if (!evaluation) throw new Error('No evaluation')
      return assignEvaluator(evaluation.id, evaluatorId || null)
    },
    onSuccess: () => {
      toast.success(evaluatorId ? 'Evaluador asignado' : 'Evaluador desasignado')
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const msg = err.errors?.evaluator_user_id?.[0] ?? err.message
        toast.error(msg)
        return
      }
      toast.error('No se pudo asignar')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Asignar evaluador</DialogTitle>
        </DialogHeader>

        {evaluation && (
          <div className="space-y-4">
            <div className="rounded-md border border-paper-line bg-paper-bg-2 px-3 py-2 text-[12.5px]">
              <span className="text-ink-3">Evaluación de </span>
              <b>{evaluation.subject?.name ?? 'Sin sujeto'}</b>
              <span className="text-ink-3"> · {evaluation.kind_label ?? evaluation.kind}</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-assignee">Evaluador</Label>
              <select
                id="ev-assignee"
                value={evaluatorId}
                onChange={(e) => setEvaluatorId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isLoading}
              >
                <option value="">— sin asignar (lo toma el primer autorizado) —</option>
                {evaluators.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.user?.name ?? p.user?.email}
                    {p.role_label ? ` · ${p.role_label}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-3">
                Sólo se puede reasignar mientras la evaluación esté programada o en curso.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="!flex-row !justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !evaluation}
          >
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
