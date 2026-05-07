'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequireRole } from '@/hooks/use-require-role'
import {
  createTemplateItem,
  deleteTemplateItem,
  listTemplate,
  resetTemplate,
  updateTemplateItem,
  type OnboardingTemplateItem,
} from '@/features/onboarding/api/template'

const RESPONSIBLE_OPTIONS = ['RRHH', 'TI', 'Líder', 'Mentor', 'Practicante']

export default function OnboardingPlantillaPage() {
  const allowed = useRequireRole(['tenant_admin', 'hr'])
  const qc = useQueryClient()
  const [adding, setAdding] = useState<{ group: string; order: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-template'],
    queryFn: listTemplate,
  })

  const items = data?.data ?? []
  const isDefault = data?.meta.is_default ?? true

  const groups = useMemo(() => {
    const map: Record<string, { name: string; order: number; items: OnboardingTemplateItem[] }> = {}
    for (const it of items) {
      const k = `${it.group_order}|${it.group_name}`
      if (!map[k]) map[k] = { name: it.group_name, order: it.group_order, items: [] }
      map[k].items.push(it)
    }
    return Object.values(map).sort((a, b) => a.order - b.order)
  }, [items])

  const create = useMutation({
    mutationFn: createTemplateItem,
    onSuccess: () => {
      toast.success('Paso añadido al template')
      qc.invalidateQueries({ queryKey: ['onboarding-template'] })
      setAdding(null)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo añadir'),
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OnboardingTemplateItem> }) =>
      updateTemplateItem(id, input as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-template'] })
      setEditingId(null)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo actualizar'),
  })

  const remove = useMutation({
    mutationFn: deleteTemplateItem,
    onSuccess: () => {
      toast.success('Paso eliminado')
      qc.invalidateQueries({ queryKey: ['onboarding-template'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo eliminar'),
  })

  const reset = useMutation({
    mutationFn: resetTemplate,
    onSuccess: () => {
      toast.success('Template restablecido al default')
      qc.invalidateQueries({ queryKey: ['onboarding-template'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo restablecer'),
  })

  if (!allowed) return null

  return (
    <div>
      <SectionTitle
        kicker="Workspace · Onboarding"
        title="Plantilla de onboarding"
        sub={
          isLoading
            ? 'Cargando…'
            : `${items.length} pasos en ${groups.length} grupos${isDefault ? ' · usando template default' : ''}`
        }
        right={
          !isDefault && (
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Restablecer al template default? Esto borra tu personalización.')) {
                  reset.mutate()
                }
              }}
              disabled={reset.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft disabled:opacity-50"
            >
              <Icon.AlertTriangle size={12} />
              Restablecer al default
            </button>
          )
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-md border border-paper-line bg-paper-bg-2 p-3 text-[12.5px] text-ink-2">
        <Icon.Sparkles size={14} className="mt-0.5 shrink-0 text-ink-3" />
        <div>
          <b className="text-ink">Estos cambios solo aplican a nuevos practicantes.</b> Los actuales
          conservan su checklist actual. Cuando alguien acepte una invitación con rol de practicante,
          recibirá la versión actual de esta plantilla con fechas de vencimiento calculadas desde su
          fecha de inicio.
          {isDefault && (
            <div className="mt-1 text-ink-3">
              Estás viendo el template default del sistema. Al añadir o editar un paso, se creará
              tu copia personalizada.
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <PaperCard
              key={g.order}
              title={
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.6px] text-ink-3">
                    {String(g.order + 1).padStart(2, '0')}
                  </span>
                  <span>{g.name}</span>
                </span>
              }
              right={
                <button
                  type="button"
                  onClick={() => {
                    const maxOrder = Math.max(-1, ...g.items.map((i) => i.item_order))
                    setAdding({ group: g.name, order: g.order })
                    setEditingId(null)
                    void maxOrder
                  }}
                  className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink"
                >
                  <Icon.Plus size={11} />
                  Añadir paso
                </button>
              }
            >
              <div className="-my-2">
                {g.items.map((it, ii) => (
                  <ItemRow
                    key={it.id ?? `${g.order}-${ii}`}
                    item={it}
                    isFirst={ii === 0}
                    isEditing={editingId === it.id}
                    onEdit={() => setEditingId(it.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(input) => update.mutate({ id: it.id!, input })}
                    onDelete={() => {
                      if (confirm(`¿Eliminar "${it.title}"?`)) remove.mutate(it.id!)
                    }}
                    onToggleEnabled={(enabled) =>
                      update.mutate({ id: it.id!, input: { enabled } })
                    }
                  />
                ))}
                {adding && adding.group === g.name && (
                  <NewItemRow
                    groupName={g.name}
                    groupOrder={g.order}
                    onCreate={(input) => create.mutate(input)}
                    onCancel={() => setAdding(null)}
                    isPending={create.isPending}
                  />
                )}
              </div>
            </PaperCard>
          ))}

          {/* Nuevo grupo */}
          <PaperCard>
            <button
              type="button"
              onClick={() => {
                const name = prompt('Nombre del nuevo grupo:')
                if (!name?.trim()) return
                const title = prompt('Título del primer paso del grupo:')
                if (!title?.trim()) return
                const newOrder = groups.length
                create.mutate({
                  group_name: name.trim(),
                  group_order: newOrder,
                  item_order: 0,
                  title: title.trim(),
                  default_days: 7,
                  responsible_role: null,
                  enabled: true,
                })
              }}
              disabled={create.isPending}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-paper-line bg-transparent px-2 py-3 text-[12.5px] text-ink-3 hover:border-paper-line-soft hover:text-ink disabled:opacity-50"
            >
              <Icon.Plus size={12} />
              Añadir nuevo grupo
            </button>
          </PaperCard>
        </div>
      )}
    </div>
  )
}

function ItemRow({
  item,
  isFirst,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onToggleEnabled,
}: {
  item: OnboardingTemplateItem
  isFirst: boolean
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (input: Partial<OnboardingTemplateItem>) => void
  onDelete: () => void
  onToggleEnabled: (enabled: boolean) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [role, setRole] = useState(item.responsible_role ?? '')
  const [days, setDays] = useState(String(item.default_days))

  if (isEditing && item.id) {
    return (
      <div className={`grid items-center gap-2 py-2.5 ${!isFirst ? 'border-t border-paper-line-soft' : ''}`}
        style={{ gridTemplateColumns: '1fr 130px 100px auto' }}
      >
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[13px] text-ink outline-none focus:border-primary"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-primary"
        >
          <option value="">— responsable —</option>
          {RESPONSIBLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-primary"
          title="Días desde inicio para due date"
        />
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              if (!title.trim()) return
              onSave({
                title: title.trim(),
                responsible_role: role || null,
                default_days: Number(days) || 7,
              })
            }}
            className="rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper-surface hover:bg-ink-2"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[11px] text-ink-2 hover:bg-paper-bg-2"
          >
            Cancelar
          </button>
        </span>
      </div>
    )
  }

  return (
    <div
      className={`grid items-center gap-2 py-2 ${!isFirst ? 'border-t border-paper-line-soft' : ''}`}
      style={{ gridTemplateColumns: '20px 1fr 110px 80px auto' }}
    >
      <input
        type="checkbox"
        checked={item.enabled}
        disabled={!item.id}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        className="h-3.5 w-3.5 accent-primary"
        title={item.enabled ? 'Paso habilitado' : 'Paso deshabilitado'}
      />
      <div className="min-w-0">
        <div className={`truncate text-[13px] ${item.enabled ? 'text-ink' : 'text-ink-3 line-through'}`}>
          {item.title}
        </div>
      </div>
      {item.responsible_role ? (
        <PaperBadge tone="neutral" className="!text-[10.5px]">
          {item.responsible_role}
        </PaperBadge>
      ) : (
        <span className="text-[10.5px] text-ink-muted">sin responsable</span>
      )}
      <span className="font-mono text-[10.5px] text-ink-3">+{item.default_days}d</span>
      {item.id ? (
        <span className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
            title="Editar"
          >
            <Icon.Settings size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-destructive"
            title="Eliminar"
          >
            ×
          </button>
        </span>
      ) : (
        <span className="text-[10px] text-ink-muted">default</span>
      )}
    </div>
  )
}

function NewItemRow({
  groupName,
  groupOrder,
  onCreate,
  onCancel,
  isPending,
}: {
  groupName: string
  groupOrder: number
  onCreate: (input: any) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [title, setTitle] = useState('')
  const [role, setRole] = useState('')
  const [days, setDays] = useState('7')

  return (
    <div
      className="grid items-center gap-2 border-t border-paper-line-soft py-2.5"
      style={{ gridTemplateColumns: '1fr 130px 100px auto' }}
    >
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del nuevo paso…"
        className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[13px] text-ink outline-none focus:border-primary"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-primary"
      >
        <option value="">— responsable —</option>
        {RESPONSIBLE_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        max={365}
        value={days}
        onChange={(e) => setDays(e.target.value)}
        className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-primary"
        title="Días desde inicio para due date"
      />
      <span className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            if (!title.trim()) return
            onCreate({
              group_name: groupName,
              group_order: groupOrder,
              item_order: 99,
              title: title.trim(),
              responsible_role: role || null,
              default_days: Number(days) || 7,
              enabled: true,
            })
          }}
          disabled={!title.trim() || isPending}
          className="rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
        >
          {isPending ? 'Añadiendo…' : 'Añadir'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[11px] text-ink-2 hover:bg-paper-bg-2"
        >
          Cancelar
        </button>
      </span>
    </div>
  )
}
