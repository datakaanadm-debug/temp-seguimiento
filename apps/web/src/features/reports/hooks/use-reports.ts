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
    onSuccess: (res: any) => {
      // Optimistic insert: meto el run nuevo al inicio de cualquier query
      // ['reports', 'runs', ...] que esté cacheada, así /reportes lo ve
      // sin tener que esperar al refetch tras el navigate.
      const newRun = res?.data
      if (newRun?.id) {
        qc.setQueriesData<any>({ queryKey: ['reports', 'runs'] }, (old: any) => {
          if (!old?.data) return old
          // Si ya está (por carrera con otra query), no duplicar.
          if (old.data.some((r: any) => r.id === newRun.id)) return old
          return {
            ...old,
            data: [newRun, ...old.data],
            meta: old.meta ? { ...old.meta, total: (old.meta.total ?? 0) + 1 } : old.meta,
          }
        })
      }
      // refetchType:'all' fuerza el fetch incluso de queries inactivas,
      // así al navegar a /reportes la lista trae el run real (no solo
      // el insertado optimista).
      qc.invalidateQueries({ queryKey: ['reports', 'runs'], refetchType: 'all' })

      // Con QUEUE_CONNECTION=sync el job ejecuta inline y la respuesta
      // ya trae status='completed'. Reflejamos el estado real para no
      // engañar al usuario. En producción con queue async, queued.
      const status = newRun?.status
      if (status === 'completed') {
        toast.success('Reporte generado. Disponible para descargar en el historial.')
      } else if (status === 'failed') {
        toast.error('La generación del reporte falló. Revisa el historial.')
      } else {
        toast.success('Reporte en cola. Te avisaremos cuando esté listo.')
      }
    },
    onError: (e: any) => {
      // Mensajes amigables por código frecuentes (429 throttle, 422 validación)
      if (e?.status === 429) {
        toast.error('Demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo.')
      } else if (e?.status === 422) {
        const first = e?.errors ? Object.values(e.errors)[0] : null
        toast.error(Array.isArray(first) ? first[0] : (e?.message ?? 'Datos inválidos'))
      } else {
        toast.error(e?.message ?? 'No se pudo solicitar el reporte')
      }
    },
  })
}
