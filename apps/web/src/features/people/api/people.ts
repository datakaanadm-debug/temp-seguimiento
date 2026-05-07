import { apiClient } from '@/lib/api-client'
import type { DataEnvelope, MentorAssignment, PaginatedResponse, Profile } from '@/types/api'

export async function listProfiles(params: { kind?: string; q?: string; per_page?: number } = {}) {
  return apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', { searchParams: params as any })
}

export async function getProfile(id: string): Promise<DataEnvelope<Profile>> {
  return apiClient.get(`/api/v1/profiles/${id}`)
}

export async function getMyProfile(): Promise<DataEnvelope<Profile>> {
  return apiClient.get('/api/v1/profiles/me')
}

export async function updateProfile(id: string, fields: Partial<Profile>) {
  return apiClient.patch<DataEnvelope<Profile>>(`/api/v1/profiles/${id}`, fields)
}

export async function upsertInternData(profileId: string, fields: Record<string, unknown>) {
  return apiClient.put<DataEnvelope<any>>(`/api/v1/profiles/${profileId}/intern-data`, fields)
}

export async function markInternHired(profileId: string) {
  return apiClient.post<DataEnvelope<Profile> & { meta?: { was_first_time: boolean } }>(
    `/api/v1/profiles/${profileId}/mark-hired`,
  )
}

// Mentor assignments
export async function listMentorAssignments(params: { status?: string; intern_user_id?: string; mentor_user_id?: string } = {}) {
  return apiClient.get<PaginatedResponse<MentorAssignment>>('/api/v1/mentor-assignments', { searchParams: params as any })
}

export async function assignMentor(input: {
  mentor_user_id: string
  intern_user_id: string
  notes?: string | null
}) {
  return apiClient.post<DataEnvelope<MentorAssignment>>('/api/v1/mentor-assignments', input)
}

export async function unassignMentor(id: string) {
  return apiClient.delete<DataEnvelope<MentorAssignment>>(`/api/v1/mentor-assignments/${id}`)
}
