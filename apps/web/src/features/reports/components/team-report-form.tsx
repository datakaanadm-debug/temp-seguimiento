'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { listTeams } from '@/features/organization/api/organization'
import { useReportTemplates, useRequestReport } from '../hooks/use-reports'

const schema = z.object({
  team_id: z.string().uuid('Elige un equipo'),
  period_start: z.string().min(1, 'Fecha requerida'),
  period_end: z.string().min(1, 'Fecha requerida'),
})

type FormValues = z.infer<typeof schema>

export function TeamReportForm() {
  const router = useRouter()
  const { data: templates, isLoading: loadingTemplates } = useReportTemplates({ kind: 'team' })
  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams', { all: true }],
    queryFn: () => listTeams(),
    staleTime: 60_000,
  })
  const request = useRequestReport()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      team_id: '',
      // Default: últimos 90 días, igual que el reporte universidad.
      period_start: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = async (data: FormValues) => {
    const template = templates?.data?.[0]
    if (!template) {
      alert('No hay template "Equipo". Pide a un admin que lo configure en Settings → Templates.')
      return
    }
    try {
      await request.mutateAsync({
        template_id: template.id,
        subject_type: 'team',
        subject_id: data.team_id,
        period_start: data.period_start,
        period_end: data.period_end,
      })
      router.push('/reportes')
    } catch {
      // Toast ya mostrado por useRequestReport.onError.
    }
  }

  if (loadingTemplates || loadingTeams) {
    return <Skeleton className="h-64" />
  }

  const teams = teamsData?.data ?? []

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team_id">Equipo</Label>
        <select
          id="team_id"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...form.register('team_id')}
        >
          <option value="">— Selecciona un equipo —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {form.formState.errors.team_id && (
          <p className="text-xs text-destructive">{form.formState.errors.team_id.message}</p>
        )}
        {teams.length === 0 && (
          <p className="text-xs text-ink-3">
            No hay equipos creados todavía. Ve a <b>/practicantes</b> o configuración para crear uno.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="period_start">Desde</Label>
          <Input id="period_start" type="date" {...form.register('period_start')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period_end">Hasta</Label>
          <Input id="period_end" type="date" {...form.register('period_end')} />
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={request.isPending || teams.length === 0}>
          {request.isPending ? 'Solicitando…' : 'Generar PDF'}
        </Button>
      </div>
    </form>
  )
}
