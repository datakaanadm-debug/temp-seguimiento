'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { getRunningTimer, startTimer, stopTimer } from '../api/tasks'
import type { TimeEntry } from '@/types/api'

export function useRunningTimer() {
  return useQuery({
    queryKey: ['time-entries', 'running'],
    queryFn: () => getRunningTimer().then((r) => r.data),
    staleTime: 5_000,
    refetchInterval: 30_000,
  })
}

export function useStartTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note?: string | null }) => startTimer(taskId, note),
    onSuccess: (res) => {
      qc.setQueryData(['time-entries', 'running'], res.data)
      toast.success('Timer iniciado')
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.errors?.timer?.[0] ?? err.message : 'No se pudo iniciar timer'
      toast.error(msg)
    },
  })
}

export function useStopTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, note }: { entryId: string; note?: string | null }) => stopTimer(entryId, note),
    onSuccess: (res) => {
      qc.setQueryData(['time-entries', 'running'], null)
      if (res.data.task_id) {
        qc.invalidateQueries({ queryKey: ['tasks', res.data.task_id, 'time-entries'] })
        qc.invalidateQueries({ queryKey: ['tasks', 'detail', res.data.task_id] })
      }
      toast.success(`Timer detenido · ${res.data.duration_minutes ?? 0} min`)
    },
    onError: () => toast.error('No se pudo detener el timer'),
  })
}

export type { TimeEntry }
