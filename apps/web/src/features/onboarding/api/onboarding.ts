import { apiClient } from '@/lib/api-client'
import type { DataEnvelope } from '@/types/api'

export interface OnboardingItem {
  id: string
  title: string
  responsible_role: string | null
  responsible_name: string | null
  due_at: string | null
  done: boolean
  completed_at: string | null
  notes: string | null
  order: number
}

export interface OnboardingGroup {
  name: string
  order: number
  items: OnboardingItem[]
}

export interface OnboardingChecklist {
  intern_user_id: string
  total: number
  done: number
  progress_percent: number
  groups: OnboardingGroup[]
}

export async function getChecklist(internUserId?: string): Promise<DataEnvelope<OnboardingChecklist>> {
  return apiClient.get('/api/v1/onboarding/checklist', {
    searchParams: internUserId ? { intern_user_id: internUserId } : undefined,
  })
}

export async function toggleItem(itemId: string) {
  return apiClient.post<DataEnvelope<{ id: string; done: boolean; completed_at: string | null }>>(
    `/api/v1/onboarding/items/${itemId}/toggle`,
  )
}

export async function createItem(input: {
  intern_user_id: string
  group_name: string
  group_order?: number
  item_order?: number
  title: string
  responsible_role?: string
  responsible_name?: string
  due_at?: string | null
}) {
  return apiClient.post<DataEnvelope<OnboardingItem>>('/api/v1/onboarding/items', input)
}

export async function deleteItem(itemId: string) {
  return apiClient.delete<{ ok: true }>(`/api/v1/onboarding/items/${itemId}`)
}
