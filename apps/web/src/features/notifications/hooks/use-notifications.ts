'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeChannel } from '@/hooks/use-realtime-channel'
import { useCurrentUser } from '@/providers/auth-provider'
import {
  deleteNotification, getUnreadCount, listNotifications, listPreferences,
  markAllRead, markRead, upsertPreferences,
} from '../api/notifications'
import type { NotificationPreference } from '@/types/api'

export function useNotifications(params: { unread?: boolean } = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => listNotifications({ ...params, per_page: 50 }),
    staleTime: 30_000,
  })
}

export function useUnreadCount() {
  const qc = useQueryClient()
  const user = useCurrentUser()

  useRealtimeChannel<unknown>(user ? `user.${user.id}` : null, 'notification.received', () => {
    qc.setQueryData(['notifications', 'unread-count'], (old: any) => ({
      unread_count: (old?.unread_count ?? 0) + 1,
    }))
    qc.invalidateQueries({ queryKey: ['notifications'] })
  })

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.setQueryData(['notifications', 'unread-count'], { unread_count: 0 })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function usePreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => listPreferences().then((r) => r.data),
    staleTime: 5 * 60_000,
  })
}

export function useUpsertPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (preferences: NotificationPreference[]) => upsertPreferences(preferences),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
  })
}
