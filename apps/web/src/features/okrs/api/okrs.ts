import { apiClient } from '@/lib/api-client'
import type { DataEnvelope } from '@/types/api'

export type OkrLevel = 'company' | 'team' | 'individual'

export interface KeyResult {
  id: string
  position: number
  text: string
  progress_percent: number
  confidence: number
  unit: string
}

export interface Objective {
  id: string
  level: OkrLevel
  label: string
  quarter: string
  owner_type: 'tenant' | 'team' | 'user'
  owner_id: string
  owner_name: string | null
  parent_objective_id: string | null
  status: string
  key_results: KeyResult[]
}

export async function listObjectives(params: {
  level?: OkrLevel
  quarter?: string
  owner_id?: string
  owner_type?: 'tenant' | 'team' | 'user'
  mine?: boolean
} = {}): Promise<{ data: Objective[] }> {
  return apiClient.get('/api/v1/objectives', { searchParams: params as any })
}

export async function createObjective(input: {
  level: OkrLevel
  label: string
  quarter: string
  owner_type: 'tenant' | 'team' | 'user'
  owner_id: string
  owner_name?: string
  parent_objective_id?: string | null
  key_results?: Array<{ text: string; progress_percent?: number; confidence?: number }>
}) {
  return apiClient.post<DataEnvelope<Objective>>('/api/v1/objectives', input)
}

export async function deleteObjective(id: string) {
  return apiClient.delete<{ ok: true }>(`/api/v1/objectives/${id}`)
}

export async function checkInKeyResult(krId: string, input: {
  new_progress: number
  new_confidence?: number
  note?: string
}) {
  return apiClient.post<DataEnvelope<{ id: string; progress_percent: number; confidence: number }>>(
    `/api/v1/key-results/${krId}/check-in`,
    input,
  )
}
