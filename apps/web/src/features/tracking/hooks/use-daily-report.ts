'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import {
  getTodayReport, listDailyReports, upsertDailyReport,
  type UpsertDailyReportInput,
} from '../api/tracking'

export function useTodayReport() {
  return useQuery({
    queryKey: ['daily-report', 'today'],
    queryFn: () => getTodayReport().then((r) => r.data),
    staleTime: 30_000,
  })
}

export function useDailyReports(params: Parameters<typeof listDailyReports>[0] = {}) {
  return useQuery({
    queryKey: ['daily-reports', params],
    queryFn: () => listDailyReports(params),
    staleTime: 30_000,
  })
}

export function useUpsertDailyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertDailyReportInput) => upsertDailyReport(input),
    onSuccess: (res) => {
      qc.setQueryData(['daily-report', 'today'], res.data)
      qc.invalidateQueries({ queryKey: ['daily-reports'] })
      toast.success(res.data.status === 'submitted' ? 'Reporte enviado' : 'Borrador guardado')
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo guardar el reporte'
      toast.error(msg)
    },
  })
}
