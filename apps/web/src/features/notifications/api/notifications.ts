import { apiClient } from '@/lib/api-client'
import type { AppNotification, DataEnvelope, NotificationPreference, PaginatedResponse } from '@/types/api'

export async function listNotifications(params: { unread?: boolean; per_page?: number } = {}) {
  return apiClient.get<PaginatedResponse<AppNotification> & { meta: { unread_count: number } }>(
    '/api/v1/notifications',
    { searchParams: params as any },
  )
}

export async function getUnreadCount() {
  return apiClient.get<{ unread_count: number }>('/api/v1/notifications/unread-count')
}

export async function markRead(id: string) {
  return apiClient.post<DataEnvelope<AppNotification>>(`/api/v1/notifications/${id}/read`)
}

export async function markAllRead() {
  return apiClient.post<{ marked_read: number }>('/api/v1/notifications/read-all')
}

export async function deleteNotification(id: string) {
  return apiClient.delete<{ deleted: number }>(`/api/v1/notifications/${id}`)
}

export async function listPreferences() {
  return apiClient.get<{ data: NotificationPreference[] }>('/api/v1/notification-preferences')
}

export async function upsertPreferences(preferences: NotificationPreference[]) {
  return apiClient.put<{ data: NotificationPreference[] }>('/api/v1/notification-preferences', {
    preferences,
  })
}
