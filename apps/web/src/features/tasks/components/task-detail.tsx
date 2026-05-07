'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar, PriorityDot,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useTask, useTasks } from '../hooks/use-tasks'
import { useChangeTaskState, useUpdateTask } from '../hooks/use-task-mutations'
import { useRunningTimer, useStartTimer, useStopTimer } from '../hooks/use-timer'
import {
  ALLOWED_TRANSITIONS, STATE_LABELS, PRIORITY_LABELS,
} from '../lib/state-machine'
import { listTags } from '../api/tasks'
import { listObjectives } from '@/features/okrs/api/okrs'
import { TaskCommentsThread } from './task-comments-thread'
import { TaskSubtasks } from './task-subtasks'
import { TaskAttachmentsPanel } from './task-attachments-panel'
import type { PaginatedResponse, Profile, Tag, TaskPriority, TaskState } from '@/types/api'

const STATE_TONE: Record<TaskState, 'neutral' | 'info' | 'accent' | 'warn' | 'ok' | 'danger'> = {
  BACKLOG: 'neutral',
  TO_DO: 'info',
  IN_PROGRESS: 'accent',
  IN_REVIEW: 'warn',
  DONE: 'ok',
  BLOCKED: 'danger',
  CANCELLED: 'neutral',
}

const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'normal', 'low']

export function TaskDetail({ taskId }: { taskId: string }) {
  const { data: task, isLoading } = useTask(taskId)
  const update = useUpdateTask(taskId)
  const changeState = useChangeTaskState(taskId)
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const { data: runningTimer } = useRunningTimer()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1180px] px-7 py-5 space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-[1180px] px-7 py-16 text-center text-[13px] text-ink-3">
        Tarea no encontrada.
      </div>
    )
  }

  const allowed = ALLOWED_TRANSITIONS[task.state]
  const thisTimerRunning = runningTimer?.task_id === task.id
  const otherTimerRunning = !!runningTimer && runningTimer.task_id !== task.id
  const actualH = task.actual_minutes / 60
  const estH = task.estimated_minutes ? task.estimated_minutes / 60 : 0

  const onChangeState = (state: TaskState) => {
    if (state === 'BLOCKED') {
      const r = prompt('¿Cuál es el bloqueo?', '')
      if (!r || r.trim() === '') return
      changeState.mutate({ state, reason: r })
    } else {
      changeState.mutate({ state })
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-7 py-5 pb-10">
      <Link
        href="/tareas"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Tareas
      </Link>

      <SectionTitle
        kicker={`T-${task.id.slice(0, 8).toUpperCase()}`}
        title={
          <InlineText
            value={task.title}
            onSave={(v) => update.mutate({ title: v })}
            placeholder="Título de la tarea"
            as="heading"
          />
        }
        sub={
          <span className="flex items-center gap-2">
            <PaperBadge tone={STATE_TONE[task.state]}>{STATE_LABELS[task.state]}</PaperBadge>
            <span className="inline-flex items-center gap-1 text-[12px]">
              <PriorityDot p={task.priority as any} />
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.due_at && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                <Icon.Cal size={11} />
                {new Date(task.due_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </span>
        }
        right={
          <>
            {thisTimerRunning ? (
              <button
                type="button"
                onClick={() => stopTimer.mutate({ entryId: runningTimer!.id })}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-2.5 py-[7px] text-[12px] font-medium text-destructive-foreground hover:opacity-90"
              >
                <Icon.Clock size={13} />
                Detener timer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startTimer.mutate({ taskId: task.id })}
                disabled={otherTimerRunning}
                title={otherTimerRunning ? 'Ya tienes un timer corriendo' : undefined}
                className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft disabled:opacity-40"
              >
                <Icon.Clock size={13} />
                Iniciar timer
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
                >
                  Cambiar estado
                  <Icon.ChevDown size={11} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allowed.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onChangeState(s)}>
                    → {STATE_LABELS[s]}
                  </DropdownMenuItem>
                ))}
                {allowed.length === 0 && (
                  <div className="px-2 py-1.5 text-[11px] text-ink-3">Sin transiciones.</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {task.blocked_reason && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-soft p-3 text-[13px] text-destructive">
          <Icon.Flag size={14} className="mt-0.5 shrink-0" />
          <div>
            <b>Bloqueo reportado.</b> {task.blocked_reason}
          </div>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 300px' }}>
        <div className="space-y-4">
          <PaperCard title="Descripción">
            <InlineText
              value={task.description ?? ''}
              onSave={(v) => update.mutate({ description: v || null })}
              placeholder="Añade una descripción detallada…"
              multiline
            />
          </PaperCard>

          <TaskSubtasks taskId={task.id} projectId={task.project_id} />

          <TaskAttachmentsPanel taskId={task.id} />

          <TaskCommentsThread taskId={task.id} />
        </div>

        <aside className="flex flex-col gap-3">
          <PaperCard title="Propiedades">
            <div className="space-y-3">
              <FieldRow label="Asignado">
                <AssigneePicker
                  value={task.assignee?.id ?? null}
                  onChange={(v) => update.mutate({ assignee_id: v })}
                />
              </FieldRow>
              <FieldRow label="Revisor">
                <AssigneePicker
                  value={task.reviewer?.id ?? null}
                  onChange={(v) => update.mutate({ reviewer_id: v })}
                />
              </FieldRow>
              <FieldRow label="Otros asignados">
                <CollaboratorsPicker
                  value={(task.collaborators ?? []).map((c) => c.id)}
                  excludeUserIds={[
                    task.assignee?.id ?? '',
                    task.reviewer?.id ?? '',
                  ].filter(Boolean) as string[]}
                  current={task.collaborators ?? []}
                  onChange={(ids) => update.mutate({ collaborator_ids: ids })}
                />
              </FieldRow>
              <FieldRow label="Prioridad">
                <PriorityPicker
                  value={task.priority}
                  onChange={(p) => update.mutate({ priority: p })}
                />
              </FieldRow>
              <FieldRow label="Vence">
                <DatePicker
                  value={task.due_at}
                  onChange={(v) => update.mutate({ due_at: v })}
                />
              </FieldRow>
              <FieldRow label="Estimado">
                <EstimatePicker
                  value={task.estimated_minutes}
                  onChange={(m) => update.mutate({ estimated_minutes: m })}
                />
              </FieldRow>
              <FieldRow label="Vincula a OKR">
                <KeyResultPicker
                  value={task.key_result_id}
                  onChange={(v) => update.mutate({ key_result_id: v })}
                />
              </FieldRow>
            </div>
          </PaperCard>

          <PaperCard title="Etiquetas">
            <TagsEditor
              taskId={task.id}
              currentTags={task.tags ?? []}
              onChange={(ids) => update.mutate({ tag_ids: ids })}
            />
          </PaperCard>

          <PaperCard>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-ink-3">
              Tiempo
            </div>
            <div className="mt-1 font-serif text-[26px] leading-none text-ink">
              {actualH.toFixed(1)}h
              {estH > 0 && (
                <span className="ml-1 font-mono text-[13px] text-ink-3">/{estH.toFixed(0)}h</span>
              )}
            </div>
            {estH > 0 && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-line-soft">
                <div
                  className={`h-full rounded-full ${
                    actualH > estH ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, (actualH / estH) * 100)}%` }}
                />
              </div>
            )}
          </PaperCard>

          <PaperCard>
            <div className="space-y-2 text-[12px]">
              <Row
                label="Creada"
                value={new Date(task.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              />
              {task.started_at && (
                <Row
                  label="Iniciada"
                  value={new Date(task.started_at).toLocaleDateString('es-MX')}
                />
              )}
              {task.completed_at && (
                <Row
                  label="Completada"
                  value={new Date(task.completed_at).toLocaleDateString('es-MX')}
                />
              )}
            </div>
          </PaperCard>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-3">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.4px] text-ink-3">{label}</span>
      <div>{children}</div>
    </div>
  )
}

/* ─── Inline text editor (title o descripción) ─── */
function InlineText({
  value,
  onSave,
  placeholder,
  multiline = false,
  as = 'body',
}: {
  value: string
  onSave: (v: string) => void
  placeholder: string
  multiline?: boolean
  as?: 'heading' | 'body'
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    if (as === 'heading') {
      return (
        <button
          type="button"
          onClick={() => {
            setDraft(value)
            setEditing(true)
          }}
          className="w-full text-left hover:bg-paper-bg-2 rounded px-1 -mx-1 transition"
        >
          {value || <span className="text-ink-3">{placeholder}</span>}
        </button>
      )
    }
    return (
      <div
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className="cursor-text whitespace-pre-wrap font-serif text-[15px] leading-[1.65] text-ink hover:bg-paper-bg-2 rounded p-1 -m-1 transition"
      >
        {value || <span className="italic text-[13px] text-ink-3">{placeholder}</span>}
      </div>
    )
  }

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft.trim())
  }

  if (multiline) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="w-full resize-y rounded-md border border-paper-line bg-paper-surface p-2.5 font-serif text-[15px] leading-[1.65] text-ink outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={commit}
            className="rounded-md bg-ink px-2.5 py-[5px] text-[11.5px] font-medium text-paper-surface hover:bg-ink-2"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-paper-line px-2.5 py-[5px] text-[11.5px] text-ink-2 hover:bg-paper-bg-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
      className="w-full rounded-md border border-primary bg-paper-surface px-1 py-0.5 outline-none"
    />
  )
}

/* ─── KeyResult picker ─── */
function KeyResultPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  const { data } = useQuery({
    queryKey: ['task-detail-objectives'],
    queryFn: () => listObjectives(),
    staleTime: 5 * 60_000,
  })
  // Aplanamos a opciones [Q · Objetivo → KR]. Mostramos también las
  // completadas si ya están vinculadas (para no perder el label).
  const options = (data?.data ?? []).flatMap((o) =>
    (o.key_results ?? []).map((kr) => ({
      id: kr.id,
      label: `${o.label} → ${kr.text}`,
      quarter: o.quarter,
      progress: kr.progress_percent,
      objCompleted: o.status === 'completed',
    })),
  )

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12.5px] text-ink outline-none focus:border-primary"
    >
      <option value="">— sin vincular —</option>
      {options.map((kr) => (
        <option key={kr.id} value={kr.id}>
          [{kr.quarter}] {kr.label} ({kr.progress}%)
        </option>
      ))}
    </select>
  )
}

/* ─── Assignee / Reviewer picker ─── */
function AssigneePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  const { data } = useQuery({
    queryKey: ['profiles-task-picker'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
  })
  const people = data?.data ?? []
  const current = people.find((p) => p.user_id === value)

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12.5px] text-ink outline-none focus:border-primary"
    >
      <option value="">— sin asignar —</option>
      {people.map((p) => (
        <option key={p.user_id} value={p.user_id}>
          {p.user?.name ?? p.user?.email}
        </option>
      ))}
      {value && !current && <option value={value}>— usuario externo —</option>}
    </select>
  )
}

/* ─── Collaborators picker (multi) ─── */
function CollaboratorsPicker({
  value,
  current,
  excludeUserIds,
  onChange,
}: {
  value: string[]
  current: NonNullable<import('@/types/api').Task['collaborators']>
  excludeUserIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [adding, setAdding] = useState(false)

  const { data } = useQuery({
    queryKey: ['profiles-task-picker'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
  })
  const people = data?.data ?? []
  const available = people.filter(
    (p) => !value.includes(p.user_id) && !excludeUserIds.includes(p.user_id),
  )

  const remove = (id: string) => onChange(value.filter((v) => v !== id))
  const add = (id: string) => {
    if (!id || value.includes(id)) return
    onChange([...value, id])
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {current.length === 0 && !adding && (
        <span className="text-[11.5px] text-ink-3">Sin colaboradores</span>
      )}
      {current.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-paper-line bg-paper-surface py-[2px] pl-1 pr-1.5 text-[11px] text-ink-2"
          title={c.email ?? undefined}
        >
          <TonalAvatar size={18} name={c.name ?? c.email} />
          <span className="truncate max-w-[110px]">{c.name?.split(' ')[0] ?? c.email}</span>
          <button
            type="button"
            onClick={() => remove(c.id)}
            className="ml-0.5 rounded text-ink-3 hover:text-destructive"
            aria-label={`Quitar ${c.name ?? c.email}`}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <select
          autoFocus
          onChange={(e) => add(e.target.value)}
          onBlur={() => setAdding(false)}
          className="rounded-md border border-paper-line bg-paper-surface px-1.5 py-[2px] text-[11px] text-ink outline-none focus:border-primary"
          defaultValue=""
        >
          <option value="">— selecciona —</option>
          {available.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.user?.name ?? p.user?.email}
            </option>
          ))}
        </select>
      ) : (
        available.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-paper-line bg-transparent px-1.5 py-[2px] text-[10.5px] text-ink-3 hover:border-paper-line-soft hover:text-ink"
          >
            <Icon.Plus size={10} />
            añadir
          </button>
        )
      )}
    </div>
  )
}

/* ─── Priority picker ─── */
function PriorityPicker({
  value,
  onChange,
}: {
  value: TaskPriority
  onChange: (p: TaskPriority) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-paper-line bg-paper-surface p-0.5">
      {PRIORITIES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'inline-flex items-center gap-1 rounded-[4px] px-1.5 py-[4px] text-[11px] transition',
            value === p ? 'bg-paper-bg-2 font-semibold text-ink' : 'text-ink-3 hover:text-ink',
          )}
        >
          <PriorityDot p={p} />
          {PRIORITY_LABELS[p]}
        </button>
      ))}
    </div>
  )
}

/* ─── Date picker (native) ─── */
function DatePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const asDate = value ? new Date(value).toISOString().slice(0, 10) : ''
  return (
    <input
      type="date"
      value={asDate}
      onChange={(e) => {
        const v = e.target.value
        onChange(v ? new Date(v + 'T00:00:00').toISOString() : null)
      }}
      className="w-full rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12.5px] text-ink outline-none focus:border-primary"
    />
  )
}

/* ─── Estimate picker (hours) ─── */
function EstimatePicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (minutes: number | null) => void
}) {
  const hours = value ? (value / 60).toString() : ''
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        step={0.5}
        value={hours}
        onChange={(e) => {
          const h = Number(e.target.value)
          onChange(Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null)
        }}
        className="w-20 rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12.5px] text-ink outline-none focus:border-primary"
      />
      <span className="text-[11px] text-ink-3">horas</span>
    </div>
  )
}

/* ─── Tags editor ─── */
function TagsEditor({
  taskId: _taskId,
  currentTags,
  onChange,
}: {
  taskId: string
  currentTags: Tag[]
  onChange: (tagIds: string[]) => void
}) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  })
  const allTags = tagsData?.data ?? []

  const currentIds = currentTags.map((t) => t.id)

  const createTag = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post<{ data: Tag }>('/api/v1/tags', { name })
      return res.data
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      onChange([...currentIds, t.id])
      setNewName('')
      setAdding(false)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo crear etiqueta'),
  })

  const available = allTags.filter((t) => !currentIds.includes(t.id))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {currentTags.map((t, i) => {
        const tones = ['tag1', 'tag2', 'tag3', 'tag4'] as const
        return (
          <PaperBadge key={t.id} tone={tones[i % tones.length]} className="gap-1 !text-[10.5px]">
            {t.name}
            <button
              type="button"
              onClick={() => onChange(currentIds.filter((id) => id !== t.id))}
              className="text-ink-3 hover:text-destructive"
              aria-label={`Quitar ${t.name}`}
            >
              ×
            </button>
          </PaperBadge>
        )
      })}
      {adding ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="nueva etiqueta"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) createTag.mutate(newName.trim())
              if (e.key === 'Escape') setAdding(false)
            }}
            className="w-28 rounded-md border border-paper-line bg-paper-surface px-1.5 py-[2px] text-[11px] text-ink outline-none focus:border-primary"
          />
          {available.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) onChange([...currentIds, e.target.value])
              }}
              className="rounded-md border border-paper-line bg-paper-surface px-1 py-[2px] text-[11px] text-ink outline-none focus:border-primary"
              value=""
            >
              <option value="">existente…</option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-[11px] text-ink-3 hover:text-ink"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-paper-line bg-transparent px-1.5 py-[2px] text-[10.5px] text-ink-3 hover:border-paper-line-soft hover:text-ink"
        >
          <Icon.Plus size={10} />
          añadir
        </button>
      )}
    </div>
  )
}
