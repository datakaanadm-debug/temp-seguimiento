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
  cohort: string | null
  day_number: number | null
  total_days: number
  mentor: { id: string; name: string | null; first_name: string | null } | null
  start_date: string | null
  end_date: string | null
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

export interface OnboardingAttachment {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  is_image: boolean
  download_url: string
  uploaded_by: string
  uploader: { id: string; name: string | null } | null
  created_at: string
}

export async function listItemAttachments(itemId: string): Promise<{ data: OnboardingAttachment[] }> {
  return apiClient.get(`/api/v1/onboarding/items/${itemId}/attachments`)
}

export async function uploadItemAttachment(itemId: string, file: File): Promise<{ data: OnboardingAttachment }> {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post(`/api/v1/onboarding/items/${itemId}/attachments`, fd)
}

export async function deleteItemAttachment(attachmentId: string): Promise<{ ok: true }> {
  return apiClient.delete(`/api/v1/onboarding/attachments/${attachmentId}`)
}
