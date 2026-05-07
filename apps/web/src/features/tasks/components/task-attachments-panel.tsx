'use client'

import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { PaperCard } from '@/components/ui/primitives'
import { getTenantSlug } from '@/lib/tenant'
import { useAuth } from '@/providers/auth-provider'
import { deleteAttachment, listAttachments, uploadTaskAttachment } from '../api/tasks'
import type { Attachment } from '@/types/api'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TaskAttachmentsPanel({ taskId }: { taskId: string }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => listAttachments(taskId),
  })
  const attachments: Attachment[] = data?.data ?? []

  const upload = useMutation({
    mutationFn: (file: File) => uploadTaskAttachment(taskId, file),
    onSuccess: () => {
      toast.success('Archivo subido')
      qc.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo subir'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => {
      toast.success('Archivo eliminado')
      qc.invalidateQueries({ queryKey: ['task-attachments', taskId] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo eliminar'),
  })

  const download = async (a: Attachment) => {
    try {
      const slug = getTenantSlug()
      const res = await fetch(`/api/v1/attachments/${a.id}/download`.replace(/^\/api/, 'http://localhost:8000/api'), {
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

  return (
    <PaperCard
      title={
        <span className="flex items-center gap-2">
          Archivos
          <span className="font-mono text-[10.5px] text-ink-3">{attachments.length}</span>
        </span>
      }
      right={
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-paper-line bg-transparent px-2 py-[3px] text-[11px] text-ink-3 hover:border-paper-line-soft hover:text-ink">
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload.mutate(f)
            }}
          />
          <Icon.Plus size={10} />
          {upload.isPending ? 'Subiendo…' : 'Subir'}
        </label>
      }
    >
      {attachments.length === 0 ? (
        <div className="py-3 text-center text-[12.5px] text-ink-3">
          Sin archivos adjuntos todavía.
        </div>
      ) : (
        <div className="-my-1.5">
          {attachments.map((a, i) => {
            const isOwner = a.uploaded_by === user?.id
            return (
              <div
                key={a.id}
                className={`flex items-center gap-2 py-1.5 ${i > 0 ? 'border-t border-paper-line-soft' : ''}`}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-paper-bg-2 text-ink-3"
                  aria-hidden
                >
                  <Icon.Attach size={12} />
                </span>
                <button
                  type="button"
                  onClick={() => download(a)}
                  className="min-w-0 flex-1 text-left hover:text-primary"
                >
                  <div className="truncate text-[13px] text-ink">{a.original_name}</div>
                  <div className="font-mono text-[10.5px] text-ink-3">
                    {formatSize(a.size_bytes)} · {a.mime_type.split('/')[1] ?? a.mime_type}
                  </div>
                </button>
                {a.uploader && (
                  <span className="text-[10.5px] text-ink-3">
                    {a.uploader.name?.split(' ')[0] ?? '—'}
                  </span>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Eliminar archivo?')) remove.mutate(a.id)
                    }}
                    className="rounded px-1 text-[13px] text-ink-3 hover:text-destructive"
                    aria-label="Eliminar"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PaperCard>
  )
}
