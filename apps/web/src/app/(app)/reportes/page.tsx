'use client'

import Link from 'next/link'
import { Download, GraduationCap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useReportRuns } from '@/features/reports/hooks/use-reports'
import { getDownloadUrl } from '@/features/reports/api/reports'
import { formatBytes } from '@/lib/utils'
import type { RunStatus } from '@/types/api'

const STATUS_VARIANT: Record<RunStatus, any> = {
  queued: 'outline',
  running: 'default',
  completed: 'success',
  failed: 'destructive',
  expired: 'secondary',
}
const STATUS_LABEL: Record<RunStatus, string> = {
  queued: 'En cola',
  running: 'Generando…',
  completed: 'Listo',
  failed: 'Falló',
  expired: 'Expirado',
}

export default function ReportesPage() {
  const { data, isLoading } = useReportRuns({ mine: false })
  const runs = data?.data ?? []

  const handleDownload = async (id: string) => {
    const { download_url } = await getDownloadUrl(id)
    window.open(download_url, '_blank')
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">Historial de reportes generados.</p>
        </div>
        <Button asChild>
          <Link href="/reportes/universidad/solicitar">
            <GraduationCap className="h-4 w-4" /> Reporte universidad
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : runs.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-sm text-muted-foreground">
          No has solicitado reportes aún.
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {runs.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {r.template?.name ?? 'Reporte'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  {r.file_size_bytes && ` · ${formatBytes(r.file_size_bytes)}`}
                </div>
              </div>

              {r.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>

              {r.status === 'completed' && (
                <Button size="sm" variant="outline" onClick={() => handleDownload(r.id)}>
                  <Download className="h-4 w-4" /> PDF
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
