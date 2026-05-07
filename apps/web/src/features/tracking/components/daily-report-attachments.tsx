'use client'

import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { getTenantSlug } from '@/lib/tenant'
import { useAuth } from '@/providers/auth-provider'
import {
  deleteDailyReportAttachment,
  listDailyReportAttachments,
  uploadDailyReportAttachment,
  type DailyReportAttachment,
} from '@/features/tracking/api/tracking'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DailyReportAttachments({ reportId }: { reportId: string | null }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data } = useQuery({
    queryKey: ['daily-report-attachments', reportId],
    queryFn: () => listDailyReportAttachments(reportId!),
    enabled: !!reportId,
  })
  const attachments: DailyReportAttachment[] = data?.data ?? []

  const upload = useMutation({
    mutationFn: (file: File) => uploadDailyReportAttachment(reportId!, file),
    onSuccess: () => {
      toast.success('Archivo adjuntado')
      qc.invalidateQueries({ queryKey: ['daily-report-attachments', reportId] })
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo adjuntar'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteDailyReportAttachment(id),
    onSuccess: () => {
      toast.success('Archivo eliminado')
      qc.invalidateQueries({ queryKey: ['daily-report-attachments', reportId] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo eliminar'),
  })

  const download = async (a: DailyReportAttachment) => {
    try {
      const slug = getTenantSlug()
      const res = await fetch(a.download_url, {
        credentials: 'include',
        headers: slug ? { 'X-Tenant-Slug': slug } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const tmp = document.createElement('a')
      tmp.href = url
      tmp.download = a.original_name
      document.body.appendChild(tmp)
      tmp.click()
      tmp.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo descargar')
    }
  }

  if (!reportId) {
    return (
      <span
        title="Guarda un borrador primero para poder adjuntar archivos"
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-[5px] text-[12px] text-ink-muted"
      >
        <Icon.Attach size={12} />
        Adjuntar
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {attachments.map((a) => {
        const isOwner = a.uploaded_by === user?.id
        return (
          <span
            key={a.id}
            className="inline-flex max-w-[260px] items-center gap-1 rounded-md border border-paper-line bg-paper-surface px-1.5 py-[3px] text-[11px] text-ink-2"
            title={`${a.original_name} · ${formatSize(a.size_bytes)}`}
          >
            <button
              type="button"
              onClick={() => download(a)}
              className="inline-flex max-w-[200px] items-center gap-1.5 hover:text-ink"
            >
              <Icon.Attach size={11} />
              <span className="truncate">{a.original_name}</span>
              <span className="font-mono text-[10px] text-ink-3">{formatSize(a.size_bytes)}</span>
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Eliminar este archivo?')) remove.mutate(a.id)
                }}
                className="rounded px-1 text-ink-3 hover:text-destructive"
                aria-label="Eliminar"
              >
                ×
              </button>
            )}
          </span>
        )
      })}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-[5px] text-[12px] text-ink-3 hover:bg-paper-bg-2 hover:text-ink">
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          disabled={upload.isPending}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload.mutate(f)
          }}
        />
        <Icon.Attach size={12} />
        {upload.isPending ? 'Subiendo…' : attachments.length === 0 ? 'Adjuntar' : 'Añadir otro'}
      </label>
    </div>
  )
}
