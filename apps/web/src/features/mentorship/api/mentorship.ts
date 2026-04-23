import { apiClient } from '@/lib/api-client'
import type { DataEnvelope, PaginatedResponse } from '@/types/api'

export interface MentorSessionUserRef {
  id: string
  name: string | null
  email: string
  avatar_url: string | null
}

export type MentorSessionStatus =
  | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

export interface MentorSession {
  id: string
  mentor_user_id: string
  intern_user_id: string
  mentor?: MentorSessionUserRef
  intern?: MentorSessionUserRef
  scheduled_at: string
  duration_minutes: number
  topic: string
  agenda: string[]
  location: string | null
  status: MentorSessionStatus
  status_label: string
  started_at: string | null
  completed_at: string | null
  tags: string[]
  created_at: string
}

export interface MentorNote {
  id: string
  session_id: string | null
  intern_user_id: string
  author_id: string
  author?: { id: string; name: string | null; email: string }
  visibility: 'private' | 'shared'
  body: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface GrowthSkill {
  id: string
  skill: string
  progress_percent: number
  category: string | null
}

export interface GrowthGoal {
  id: string
  text: string
  quarter: string | null
  done: boolean
  due_at: string | null
  completed_at: string | null
}

// ─── Sessions ────────────────────────────────────────────────────────────
export async function listMentorSessions(params: {
  mine_as_mentor?: boolean
  mine_as_intern?: boolean
  mentor_user_id?: string
  intern_user_id?: string
  status?: MentorSessionStatus
  upcoming_only?: boolean
  per_page?: number
} = {}): Promise<PaginatedResponse<MentorSession>> {
  return apiClient.get('/api/v1/mentor-sessions', { searchParams: params as any })
}

export async function getMentorSession(id: string): Promise<DataEnvelope<MentorSession>> {
  return apiClient.get(`/api/v1/mentor-sessions/${id}`)
}

export interface CreateMentorSessionInput {
  mentor_user_id: string
  intern_user_id: string
  scheduled_at: string
  duration_minutes?: number
  topic: string
  agenda?: string[]
  location?: string | null
  tags?: string[]
}

export async function createMentorSession(input: CreateMentorSessionInput) {
  return apiClient.post<DataEnvelope<MentorSession>>('/api/v1/mentor-sessions', input)
}

export async function updateMentorSession(id: string, input: Partial<CreateMentorSessionInput & { status: MentorSessionStatus }>) {
  return apiClient.put<DataEnvelope<MentorSession>>(`/api/v1/mentor-sessions/${id}`, input)
}

export async function cancelMentorSession(id: string) {
  return updateMentorSession(id, { status: 'cancelled' })
}

// ─── Notes ──────────────────────────────────────────────────────────────
export async function listMentorNotes(params: {
  intern_user_id?: string
  session_id?: string
  per_page?: number
} = {}): Promise<PaginatedResponse<MentorNote>> {
  return apiClient.get('/api/v1/mentor-notes', { searchParams: params as any })
}

export async function createMentorNote(input: {
  session_id?: string | null
  intern_user_id: string
  visibility: 'private' | 'shared'
  body: string
  tags?: string[]
}) {
  return apiClient.post<DataEnvelope<MentorNote>>('/api/v1/mentor-notes', input)
}

export async function updateMentorNote(id: string, input: { body: string; visibility?: 'private' | 'shared'; tags?: string[] }) {
  return apiClient.put<DataEnvelope<MentorNote>>(`/api/v1/mentor-notes/${id}`, input)
}

export async function deleteMentorNote(id: string) {
  return apiClient.delete<{ ok: true }>(`/api/v1/mentor-notes/${id}`)
}

// ─── Growth ─────────────────────────────────────────────────────────────
export async function getGrowthPath(internUserId: string): Promise<{ data: { skills: GrowthSkill[]; goals: GrowthGoal[] } }> {
  return apiClient.get(`/api/v1/growth-paths/${internUserId}`)
}

export async function upsertGrowthSkill(internUserId: string, input: { skill: string; progress_percent: number; category?: string | null }) {
  return apiClient.put<DataEnvelope<GrowthSkill>>(`/api/v1/growth-paths/${internUserId}/skills`, input)
}

export async function createGrowthGoal(internUserId: string, input: { text: string; quarter?: string; due_at?: string | null }) {
  return apiClient.post<DataEnvelope<GrowthGoal>>(`/api/v1/growth-paths/${internUserId}/goals`, input)
}

export async function toggleGrowthGoal(goalId: string) {
  return apiClient.post<DataEnvelope<GrowthGoal>>(`/api/v1/growth-goals/${goalId}/toggle`)
}

export async function deleteGrowthGoal(goalId: string) {
  return apiClient.delete<{ ok: true }>(`/api/v1/growth-goals/${goalId}`)
}
