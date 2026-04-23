'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryState, parseAsBoolean } from 'nuqs'
import { Check, CheckCheck, Trash2 } from 'lucide-react'
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

  return (
    <div className="container py-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta?.unread_count ?? 0} sin leer
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={unread ? 'default' : 'outline'} size="sm" onClick={() => setUnread(!unread)}>
            Solo sin leer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || (data?.meta?.unread_count ?? 0) === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-sm text-muted-foreground">
          {unread ? 'No tienes notificaciones sin leer.' : 'Sin notificaciones.'}
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
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
  onRead,
  onDelete,
}: {
  notification: AppNotification
  onRead: () => void
  onDelete: () => void
}) {
  const data = notification.data
  const unread = !notification.read_at
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 group',
        unread ? 'bg-primary/5' : 'hover:bg-muted/40',
      )}
    >
      <span
        className={cn(
          'mt-1.5 h-2 w-2 rounded-full shrink-0',
          unread ? 'bg-primary' : 'bg-transparent',
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{String(data.title ?? data.category ?? 'Notificación')}</div>
        {data.body && <div className="text-sm text-muted-foreground">{String(data.body)}</div>}
        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(notification.created_at).toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {unread && (
          <Button variant="ghost" size="icon" onClick={onRead} title="Marcar como leída">
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onDelete} title="Eliminar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
