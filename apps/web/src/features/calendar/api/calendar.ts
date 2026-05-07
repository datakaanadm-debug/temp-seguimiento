import { apiClient } from '@/lib/api-client'
import type { DataEnvelope } from '@/types/api'

export type CalendarSource = 'event' | 'mentor_session' | 'evaluation'
export type CalendarKind =
  | 'meeting'
  | 'sync'
  | '1on1'
  | 'focus'
  | 'standup'
  | 'review'
  | 'other'

export interface CalendarItem {
  source: CalendarSource
  id: string
  starts_at: string
  duration_minutes: number
  title: string
  kind: CalendarKind
  location: string | null
  tags: string[]
  link: string | null
}

export interface CalendarTodayResponse {
  data: CalendarItem[]
  meta: {
    date: string
    timezone: string
    count: number
  }
}

export async function getCalendarToday(date?: string): Promise<CalendarTodayResponse> {
  return apiClient.get('/api/v1/calendar/today', {
    searchParams: date ? { date } : undefined,
  })
}

export interface CreateCalendarEventInput {
  user_id?: string
  starts_at: string
  duration_minutes?: number
  title: string
  kind: CalendarKind
  location?: string | null
  description?: string | null
}

export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<DataEnvelope<{ id: string; title: string; starts_at: string }>> {
  return apiClient.post('/api/v1/calendar-events', input)
}

export async function deleteCalendarEvent(id: string): Promise<{ ok: true }> {
  return apiClient.delete(`/api/v1/calendar-events/${id}`)
}
