'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { PaperCard, TonalAvatar } from '@/components/ui/primitives'
import { useAuth } from '@/providers/auth-provider'
import { addComment, deleteComment, listComments, updateComment } from '../api/tasks'
import { cn } from '@/lib/utils'

export function TaskCommentsThread({ taskId }: { taskId: string }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => listComments(taskId),
  })
  const comments = data?.data ?? []

  const add = useMutation({
    mutationFn: (body: string) => addComment(taskId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-comments', taskId] })
      setDraft('')
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo publicar'),
  })

  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updateComment(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-comments', taskId] })
      setEditingId(null)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo editar'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-comments', taskId] }),
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo eliminar'),
  })

  return (
    <PaperCard
      title={
        <span className="flex items-center gap-2">
          Comentarios
          <span className="font-mono text-[10.5px] text-ink-3">{comments.length}</span>
        </span>
      }
    >
      {/* Nuevo comentario */}
      <div className="mb-4 flex gap-2">
        <TonalAvatar size={28} name={user?.name ?? user?.email ?? '?'} />
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un comentario… (usa @nombre para mencionar)"
            rows={draft ? 3 : 2}
            className="w-full resize-y rounded-md border border-paper-line bg-paper-surface p-2.5 text-[13px] text-ink outline-none focus:border-primary"
          />
          {draft.trim() && (
            <div className="mt-1.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft('')}
                className="text-[11.5px] text-ink-3 hover:text-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => draft.trim() && add.mutate(draft.trim())}
                disabled={add.isPending}
                className="rounded-md bg-ink px-2.5 py-[5px] text-[11.5px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
              >
                {add.isPending ? 'Publicando…' : 'Publicar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thread */}
      {isLoading ? (
        <div className="py-3 text-[12px] text-ink-3">Cargando…</div>
      ) : comments.length === 0 ? (
        <div className="border-t border-paper-line-soft pt-3 text-center text-[12.5px] text-ink-3">
          Sé el primero en comentar.
        </div>
      ) : (
        <div className="space-y-3 border-t border-paper-line-soft pt-3">
          {comments.map((c) => {
            const isMine = c.author?.id === user?.id
            const isEditing = editingId === c.id
            return (
              <div key={c.id} className="flex gap-2">
                <TonalAvatar size={26} name={c.author?.name ?? c.author?.email ?? '?'} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-ink">
                      {c.author?.name ?? c.author?.email}
                    </span>
                    <span className="font-mono text-[10.5px] text-ink-3">
                      {formatRelativeTime(c.created_at)}
                      {c.edited_at && ' · editado'}
                    </span>
                    {isMine && !isEditing && (
                      <span className="ml-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id)
                            setEditDraft(c.body)
                          }}
                          className="text-[11px] text-ink-3 hover:text-ink"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('¿Eliminar comentario?')) remove.mutate(c.id)
                          }}
                          className="text-[11px] text-ink-3 hover:text-destructive"
                        >
                          Eliminar
                        </button>
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-1 space-y-1.5">
                      <textarea
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={3}
                        className="w-full resize-y rounded-md border border-paper-line bg-paper-surface p-2 text-[13px] text-ink outline-none focus:border-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editDraft.trim() && edit.mutate({ id: c.id, body: editDraft.trim() })
                          }
                          className="rounded-md bg-ink px-2 py-[3px] text-[11px] font-medium text-paper-surface hover:bg-ink-2"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-[11px] text-ink-3 hover:text-ink"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        'mt-0.5 whitespace-pre-wrap text-[13px] leading-[1.55] text-ink-2',
                        'prose-mentions:text-primary-ink',
                      )}
                      dangerouslySetInnerHTML={{
                        __html: renderMentions(c.body),
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PaperCard>
  )
}

function renderMentions(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped.replace(
    /@([a-zA-ZáéíóúñÁÉÍÓÚÑ]+(?:\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+)?)/g,
    '<span class="text-primary-ink font-medium">@$1</span>',
  )
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const m = diffMs / 60_000
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${Math.round(m)} min`
  const h = m / 60
  if (h < 24) return `hace ${Math.round(h)} h`
  const d = h / 24
  if (d < 7) return `hace ${Math.round(d)} d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
