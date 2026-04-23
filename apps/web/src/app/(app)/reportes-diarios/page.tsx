'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { initialsFromName } from '@/lib/utils'
import { useDailyReports } from '@/features/tracking/hooks/use-daily-report'
import { Plus } from 'lucide-react'

export default function ReportesDiariosPage() {
  const { data, isLoading } = useDailyReports({ per_page: 50 })
  const reports = data?.data ?? []

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes diarios</h1>
          <p className="text-sm text-muted-foreground">Historial por practicante.</p>
        </div>
        <Button asChild>
          <Link href="/reportes-diarios/hoy">
            <Plus className="h-4 w-4" /> Reporte de hoy
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-sm text-muted-foreground">
          No hay reportes aún.
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/reportes-diarios/${r.id}`}
              className="flex items-start gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={r.user?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {initialsFromName(r.user?.name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{r.user?.name ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.report_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{r.progress_summary}</p>
              </div>
              <Badge variant={r.status === 'reviewed' ? 'success' : r.status === 'submitted' ? 'default' : 'outline'}>
                {r.status === 'reviewed' ? 'Revisado' : r.status === 'submitted' ? 'Enviado' : 'Borrador'}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
