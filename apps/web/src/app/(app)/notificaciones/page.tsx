'use client'

import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryState, parseAsBoolean } from 'nuqs'
import {
  useDeleteNotification, useMarkAllRead, useMarkRead, useNotifications,
} from '@/features/notifications/hooks/use-notifications'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types/api'

export default function NotificacionesPage() {
  const [unread, setUnread] = useQueryState('unread', parseAsBoolean.withDefault(false))
  const { data, isLoading } = useNotifications({ unread })
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const del = useDeleteNotification()
  const items = data?.data ?? []
  const unreadCount = data?.meta?.unread_count ?? 0

  return (
    <div className="mx-auto max-w-[840px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Notificaciones"
        title="Bandeja de entrada"
        sub={`${unreadCount} sin leer${items.length > 0 ? ` de ${items.length} totales` : ''}`}
        right={
          <>
            <button
              type="button"
              onClick={() => setUnread(!unread)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-[7px] text-[12px] font-medium transition',
                unread
                  ? 'border-primary-ink bg-primary text-primary-foreground'
                  : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
              )}
            >
              Sólo sin leer
            </button>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft disabled:opacity-50"
            >
              <Icon.Check size={13} />
              Marcar todas
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center text-[13px] text-ink-3">
          {unread ? 'No tienes notificaciones sin leer.' : 'Sin notificaciones aún.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
          {items.map((n, i) => (
            <NotificationItem
              key={n.id}
              notification={n}
              last={i === items.length - 1}
              onRead={() => markRead.mutate(n.id)}
              onDelete={() => del.mutate(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  last,
  onRead,
  onDelete,
}: {
  notification: AppNotification
  last: boolean
  onRead: () => void
  onDelete: () => void
}) {
  const data = notification.data
  const unread = !notification.read_at
  return (
    <div
      className={cn(
        'group grid items-start gap-3 p-4',
        !last && 'border-b border-paper-line-soft',
        unread ? 'bg-primary-soft/40' : 'hover:bg-paper-bg-2',
      )}
      style={{ gridTemplateColumns: '10px 1fr auto' }}
    >
      <span
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          unread ? 'bg-primary' : 'bg-transparent',
        )}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-ink">
            {String(data.title ?? data.category ?? 'Notificación')}
          </span>
          {unread && (
            <PaperBadge tone="accent" className="!text-[9px]">
              NUEVA
            </PaperBadge>
          )}
        </div>
        {data.body && (
          <div className="mt-0.5 text-[12.5px] leading-[1.45] text-ink-2">
            {String(data.body)}
          </div>
        )}
        <div className="mt-1 font-mono text-[10.5px] text-ink-3">
          {new Date(notification.created_at).toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {unread && (
          <button
            type="button"
            onClick={onRead}
            title="Marcar como leída"
            className="rounded-md p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
          >
            <Icon.Check size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          title="Eliminar"
          className="rounded-md p-1 text-ink-3 hover:bg-destructive-soft hover:text-destructive"
        >
          <Icon.X size={13} />
        </button>
      </div>
    </div>
  )
}
