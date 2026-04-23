'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listReportRuns, listTemplates, requestReport, type RequestReportInput,
} from '../api/reports'

export function useReportTemplates(params: { kind?: string } = {}) {
  return useQuery({
    queryKey: ['report-templates', params],
    queryFn: () => listTemplates(params),
    staleTime: 5 * 60_000,
  })
}

export function useReportRuns(params: Parameters<typeof listReportRuns>[0] = {}) {
  return useQuery({
    queryKey: ['reports', 'runs', params],
    queryFn: () => listReportRuns(params),
    staleTime: 15_000,
    // Si hay runs en progreso, refetch cada 5s
    refetchInterval: (query) => {
      const d = query.state.data
      return d?.data.some((r) => r.status === 'queued' || r.status === 'running') ? 5_000 : false
    },
  })
}

export function useRequestReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RequestReportInput) => requestReport(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports', 'runs'] })
      toast.success('Reporte en cola. Te avisaremos cuando esté listo.')
    },
    onError: () => toast.error('No se pudo solicitar el reporte'),
  })
}
