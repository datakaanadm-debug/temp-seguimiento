import { apiClient } from '@/lib/api-client'
import type { AiInsight, AiSummary, DataEnvelope, PaginatedResponse } from '@/types/api'

export async function listSummaries(params: { subject_type?: string; subject_id?: string } = {}) {
  return apiClient.get<{ data: AiSummary[] }>('/api/v1/ai/summaries', { searchParams: params as any })
}

export async function summarizeDailyReport(dailyReportId: string) {
  return apiClient.post<DataEnvelope<AiSummary>>('/api/v1/ai/summaries/daily-report', {
    daily_report_id: dailyReportId,
  })
}

export async function approveSummary(id: string) {
  return apiClient.post<DataEnvelope<AiSummary>>(`/api/v1/ai/summaries/${id}/approve`)
}

export async function listInsights(params: { active_only?: boolean; severity?: string; subject_id?: string } = {}) {
  return apiClient.get<PaginatedResponse<AiInsight>>('/api/v1/ai/insights', { searchParams: params as any })
}

export async function detectInsights(userId: string) {
  return apiClient.post<{ data: AiInsight[]; count: number }>('/api/v1/ai/insights/detect', {
    user_id: userId,
  })
}

export async function acknowledgeInsight(id: string) {
  return apiClient.post<DataEnvelope<AiInsight>>(`/api/v1/ai/insights/${id}/acknowledge`)
}

export async function dismissInsight(id: string) {
  return apiClient.post<DataEnvelope<AiInsight>>(`/api/v1/ai/insights/${id}/dismiss`)
}

export async function resolveInsight(id: string) {
  return apiClient.post<DataEnvelope<AiInsight>>(`/api/v1/ai/insights/${id}/resolve`)
}
