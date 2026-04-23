'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfiles } from '@/features/people/hooks/use-people'
import { useReportTemplates, useRequestReport } from '../hooks/use-reports'

const schema = z.object({
  intern_user_id: z.string().uuid('Elige un practicante'),
  period_start: z.string().min(1, 'Fecha requerida'),
  period_end: z.string().min(1, 'Fecha requerida'),
})

type FormValues = z.infer<typeof schema>

export function UniversityReportForm() {
  const router = useRouter()
  const { data: templates, isLoading: loadingTemplates } = useReportTemplates({ kind: 'university' })
  const { data: internsData, isLoading: loadingInterns } = useProfiles({ kind: 'intern', per_page: 100 })
  const request = useRequestReport()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      intern_user_id: '',
      period_start: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = async (data: FormValues) => {
    const template = templates?.data?.[0]
    if (!template) {
      alert('No hay template "Universidad". Pide a un admin que lo configure en Settings → Templates.')
      return
    }
    const profile = internsData?.data.find((p) => p.user_id === data.intern_user_id)
    await request.mutateAsync({
      template_id: template.id,
      subject_type: 'user',
      subject_id: data.intern_user_id,
      period_start: data.period_start,
      period_end: data.period_end,
      parameters: { intern_profile_id: profile?.id },
    })
    router.push('/reportes')
  }

  if (loadingTemplates || loadingInterns) {
    return <Skeleton className="h-64" />
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="intern_user_id">Practicante</Label>
        <select
          id="intern_user_id"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...form.register('intern_user_id')}
        >
          <option value="">— Selecciona —</option>
          {internsData?.data.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.user?.name} · {p.intern_data?.university ?? 'Sin universidad'}
            </option>
          ))}
        </select>
        {form.formState.errors.intern_user_id && (
          <p className="text-xs text-destructive">{form.formState.errors.intern_user_id.message}</p>
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
        <Button type="submit" disabled={request.isPending}>
          {request.isPending ? 'Solicitando…' : 'Generar PDF'}
        </Button>
      </div>
    </form>
  )
}
