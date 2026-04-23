'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  acknowledgeInsight, detectInsights, dismissInsight,
  listInsights, listSummaries, resolveInsight,
} from '../api/ai'

export function useSummaries(params: Parameters<typeof listSummaries>[0] = {}) {
  return useQuery({
    queryKey: ['ai', 'summaries', params],
    queryFn: () => listSummaries(params),
    staleTime: 60_000,
  })
}

export function useInsights(params: Parameters<typeof listInsights>[0] = {}) {
  return useQuery({
    queryKey: ['ai', 'insights', params],
    queryFn: () => listInsights(params),
    staleTime: 60_000,
  })
}

export function useDetectInsights() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => detectInsights(userId),
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ['ai', 'insights'] })
      toast.success(`${count} insight(s) detectados`)
    },
    onError: () => toast.error('No se pudieron detectar insights'),
  })
}

export function useInsightActions() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['ai', 'insights'] })
  return {
    acknowledge: useMutation({ mutationFn: (id: string) => acknowledgeInsight(id), onSuccess: invalidate }),
    dismiss: useMutation({ mutationFn: (id: string) => dismissInsight(id), onSuccess: invalidate }),
    resolve: useMutation({ mutationFn: (id: string) => resolveInsight(id), onSuccess: invalidate }),
  }
}
