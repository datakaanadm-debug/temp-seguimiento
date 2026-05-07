'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '../hooks/use-notifications'
import type { AppNotification } from '@/types/api'

/**
 * Bell del topbar con badge de no-leídas + dropdown con preview de las
 * 5 notificaciones más recientes. Click en una marca como leída y navega
 * (cuando aplica) al recurso linkeado en `data.url`.
 *
 * Realtime: el `useUnreadCount` ya escucha `notification.received` por
 * Pusher/Reverb y actualiza el contador sin polling agresivo.
 */
export function NotificationsBell() {
  const { data: unreadData } = useUnreadCount()
  const { data: listData, isLoading } = useNotifications({ unread: false })
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const unread = unreadData?.unread_count ?? 0
  const items: AppNotification[] = (listData?.data ?? []).slice(0, 5)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
          aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ''}`}
        >
          <Icon.Bell size={15} />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-destructive px-1 font-mono text-[9.5px] font-semibold leading-none text-white"
              aria-hidden
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0" sideOffset={4}>
        <div className="flex items-center justify-between border-b border-paper-line px-3 py-2">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-ink-3">
            Notificaciones
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-[11.5px] font-medium text-primary hover:underline disabled:opacity-50"
            >
              Marcar todas leídas
            </button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-4 text-center text-[12px] text-ink-3">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-ink-3">
              Sin notificaciones todavía.
            </div>
          ) : (
            items.map((n, i) => (
              <NotificationRow
                key={n.id}
                notification={n}
                isLast={i === items.length - 1}
                onMarkRead={() => markRead.mutate(n.id)}
              />
            ))
          )}
        </div>

        <div className="border-t border-paper-line px-3 py-2 text-center">
          <Link
            href="/notificaciones"
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Ver todas
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationRow({
  notification,
  isLast,
  onMarkRead,
}: {
  notification: AppNotification
  isLast: boolean
  onMarkRead: () => void
}) {
  const data = notification.data ?? {}
  const title =
    (typeof data.title === 'string' && data.title)
    || prettifyType(notification.type)
  const body = typeof data.body === 'string' ? data.body : null
  const url = typeof data.url === 'string' ? data.url : null
  const isUnread = notification.read_at === null

  const Wrapper = url ? Link : ('div' as const)
  const wrapperProps = url ? { href: url } : {}

  return (
    <Wrapper
      {...(wrapperProps as any)}
      onClick={() => {
        if (isUnread) onMarkRead()
      }}
      className={cn(
        'flex items-start gap-2.5 px-3 py-2.5',
        !isLast && 'border-b border-paper-line-soft',
        url && 'cursor-pointer hover:bg-paper-bg-2',
        isUnread && 'bg-primary-soft/40',
      )}
    >
      <div className="mt-0.5 flex h-2 w-2 shrink-0 items-center justify-center">
        {isUnread && (
          <span className="h-2 w-2 rounded-full bg-primary" aria-label="No leída" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('text-[12.5px] leading-snug', isUnread ? 'font-semibold text-ink' : 'text-ink-2')}>
          {title}
        </div>
        {body && (
          <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-3">
            {body}
          </div>
        )}
        <div className="mt-1 font-mono text-[10px] text-ink-muted">
          {formatRelative(notification.created_at)}
        </div>
      </div>
    </Wrapper>
  )
}

function prettifyType(type: string): string {
  // E.g. "TaskAssigned" → "Task asignada", "BlockerRaised" → "Blocker generado".
  // Fallback decente cuando el listener no llenó `data.title`.
  return type
    .replace(/^.*\\/, '')
    .replace(/Notification$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const m = Math.floor(diffMs / 60_000)
  if (m < 1) return 'recién'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `hace ${days}d`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
