import { apiClient } from '@/lib/api-client'
import type { DataEnvelope } from '@/types/api'

export interface OnboardingTemplateItem {
  id: string | null
  group_name: string
  group_order: number
  item_order: number
  title: string
  responsible_role: string | null
  default_days: number
  enabled: boolean
}

export interface TemplateIndexResponse {
  data: OnboardingTemplateItem[]
  meta: { is_default: boolean; count: number }
}

export interface UpsertTemplateInput {
  group_name: string
  group_order?: number
  item_order?: number
  title: string
  responsible_role?: string | null
  default_days?: number
  enabled?: boolean
}

export async function listTemplate(): Promise<TemplateIndexResponse> {
  return apiClient.get('/api/v1/onboarding/template')
}

export async function createTemplateItem(input: UpsertTemplateInput) {
  return apiClient.post<DataEnvelope<OnboardingTemplateItem>>('/api/v1/onboarding/template', input)
}

export async function updateTemplateItem(id: string, input: Partial<UpsertTemplateInput>) {
  return apiClient.patch<DataEnvelope<OnboardingTemplateItem>>(`/api/v1/onboarding/template/${id}`, input)
}

export async function deleteTemplateItem(id: string) {
  return apiClient.delete<{ ok: true; remaining: number }>(`/api/v1/onboarding/template/${id}`)
}

export async function resetTemplate() {
  return apiClient.post<{ ok: true; deleted: number; message: string }>('/api/v1/onboarding/template/reset')
}
