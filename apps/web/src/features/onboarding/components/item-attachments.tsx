'use client'

import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import {
  deleteItemAttachment,
  listItemAttachments,
  uploadItemAttachment,
  type OnboardingAttachment,
} from '@/features/onboarding/api/onboarding'
import { getTenantSlug } from '@/lib/tenant'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ItemAttachments({
  itemId,
  internUserId,
  canUpload,
}: {
  itemId: string
  internUserId: string
  canUpload: boolean
}) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-item-attachments', itemId],
    queryFn: () => listItemAttachments(itemId),
  })
  const attachments: OnboardingAttachment[] = data?.data ?? []

  const upload = useMutation({
    mutationFn: (file: File) => uploadItemAttachment(itemId, file),
    onSuccess: () => {
      toast.success('Documento subido')
      qc.invalidateQueries({ queryKey: ['onboarding-item-attachments', itemId] })
      qc.invalidateQueries({ queryKey: ['onboarding-checklist', internUserId] })
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo subir el archivo'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteItemAttachment(id),
    onSuccess: () => {
      toast.success('Documento eliminado')
      qc.invalidateQueries({ queryKey: ['onboarding-item-attachments', itemId] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo eliminar'),
  })

  if (isLoading) return null

  if (attachments.length === 0 && !canUpload) return null

  const downloadAttachment = async (a: OnboardingAttachment) => {
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

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-paper-line-soft pt-1.5">
      {attachments.map((a) => (
        <span
          key={a.id}
          className="inline-flex max-w-[260px] items-center gap-1 rounded-md border border-paper-line bg-paper-surface px-1.5 py-[3px] text-[11px] text-ink-2"
          title={`${a.original_name} · ${formatSize(a.size_bytes)}`}
        >
          <button
            type="button"
            onClick={() => downloadAttachment(a)}
            className="inline-flex max-w-[200px] cursor-pointer items-center gap-1.5 hover:text-ink"
          >
            <Icon.Attach size={11} />
            <span className="truncate">{a.original_name}</span>
            <span className="font-mono text-[10px] text-ink-3">{formatSize(a.size_bytes)}</span>
          </button>
          {canUpload && (
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Eliminar este documento?')) remove.mutate(a.id)
              }}
              disabled={remove.isPending}
              className="rounded px-1 text-ink-3 hover:text-destructive"
              aria-label="Eliminar"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {canUpload && (
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-paper-line bg-transparent px-2 py-[3px] text-[11px] text-ink-3 hover:border-paper-line-soft hover:text-ink">
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
          <Icon.Plus size={10} />
          {upload.isPending ? 'Subiendo…' : attachments.length === 0 ? 'Subir documento' : 'Añadir otro'}
        </label>
      )}
    </div>
  )
}
