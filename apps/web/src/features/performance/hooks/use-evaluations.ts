'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import {
  acknowledgeEvaluation, cancelEvaluation, disputeEvaluation, getEvaluation,
  listEvaluations, resolveEvaluation, saveResponses, submitEvaluation,
} from '../api/performance'

export function useEvaluations(params: Parameters<typeof listEvaluations>[0] = {}) {
  return useQuery({
    queryKey: ['evaluations', params],
    queryFn: () => listEvaluations(params),
    staleTime: 30_000,
  })
}

export function useEvaluation(id: string | null | undefined) {
  return useQuery({
    queryKey: ['evaluations', 'detail', id],
    queryFn: () => getEvaluation(id!).then((r) => r.data),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useSaveResponses(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof saveResponses>[1]) => saveResponses(id, input),
    onSuccess: (res) => {
      qc.setQueryData(['evaluations', 'detail', id], res.data)
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      toast.success('Respuestas guardadas')
    },
    onError: () => toast.error('No se pudo guardar'),
  })
}

export function useSubmitEvaluation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => submitEvaluation(id),
    onSuccess: (res) => {
      qc.setQueryData(['evaluations', 'detail', id], res.data)
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      toast.success('Evaluación enviada')
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo enviar'
      toast.error(msg)
    },
  })
}

export function useAcknowledgeEvaluation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => acknowledgeEvaluation(id),
    onSuccess: (res) => {
      qc.setQueryData(['evaluations', 'detail', id], res.data)
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      toast.success('Confirmada')
    },
    onError: () => toast.error('No se pudo confirmar'),
  })
}

export function useDisputeEvaluation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string | null) => disputeEvaluation(id, reason),
    onSuccess: (res) => {
      qc.setQueryData(['evaluations', 'detail', id], res.data)
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      toast.success('Disputa registrada. RR. HH. la revisará.')
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo registrar la disputa'
      toast.error(msg)
    },
  })
}

export function useResolveEvaluation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (resolution: string | null) => resolveEvaluation(id, resolution),
    onSuccess: (res) => {
      qc.setQueryData(['evaluations', 'detail', id], res.data)
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      toast.success('Disputa resuelta')
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo resolver'
      toast.error(msg)
    },
  })
}

export function useCancelEvaluation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string | null) => cancelEvaluation(id, reason),
    onSuccess: (res) => {
      qc.setQueryData(['evaluations', 'detail', id], res.data)
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      toast.success('Evaluación cancelada')
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cancelar'
      toast.error(msg)
    },
  })
}
