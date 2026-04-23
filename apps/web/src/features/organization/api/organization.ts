import { apiClient } from '@/lib/api-client'
import type { Area, DataEnvelope, Department, Team, TeamMembership } from '@/types/api'

export async function listDepartments() {
  return apiClient.get<{ data: Department[] }>('/api/v1/departments')
}
export async function createDepartment(input: { name: string; slug: string }) {
  return apiClient.post<DataEnvelope<Department>>('/api/v1/departments', input)
}

export async function listAreas(params: { department_id?: string } = {}) {
  return apiClient.get<{ data: Area[] }>('/api/v1/areas', { searchParams: params as any })
}
export async function createArea(input: { department_id: string; name: string; slug: string }) {
  return apiClient.post<DataEnvelope<Area>>('/api/v1/areas', input)
}

export async function listTeams(params: { area_id?: string } = {}) {
  return apiClient.get<{ data: Team[] }>('/api/v1/teams', { searchParams: params as any })
}
export async function createTeam(input: {
  area_id: string
  name: string
  slug: string
  lead_user_id?: string | null
  color?: string
}) {
  return apiClient.post<DataEnvelope<Team>>('/api/v1/teams', input)
}
export async function getTeam(id: string) {
  return apiClient.get<DataEnvelope<Team>>(`/api/v1/teams/${id}`)
}
export async function listTeamMembers(id: string) {
  return apiClient.get<{ data: TeamMembership[] }>(`/api/v1/teams/${id}/members`)
}
export async function addTeamMember(teamId: string, userId: string, role: string) {
  return apiClient.post<DataEnvelope<TeamMembership>>(`/api/v1/teams/${teamId}/members`, {
    user_id: userId,
    role,
  })
}
export async function removeTeamMember(teamId: string, membershipId: string) {
  return apiClient.delete(`/api/v1/teams/${teamId}/members/${membershipId}`)
}
