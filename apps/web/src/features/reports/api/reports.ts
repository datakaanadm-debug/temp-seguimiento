import { apiClient } from '@/lib/api-client'
import type { DataEnvelope, PaginatedResponse, ReportRun, ReportTemplate } from '@/types/api'

export async function listTemplates(params: { kind?: string } = {}) {
  return apiClient.get<{ data: ReportTemplate[] }>('/api/v1/report-templates', { searchParams: params as any })
}

export async function listReportRuns(params: { mine?: boolean; status?: string; template_id?: string } = {}) {
  return apiClient.get<PaginatedResponse<ReportRun>>('/api/v1/reports', { searchParams: params as any })
}

export async function getReportRun(id: string) {
  return apiClient.get<DataEnvelope<ReportRun>>(`/api/v1/reports/${id}`)
}

export interface RequestReportInput {
  template_id: string
  subject_type?: 'user' | 'team' | 'department' | 'tenant'
  subject_id?: string
  period_start?: string
  period_end?: string
  parameters?: Record<string, unknown>
}

export async function requestReport(input: RequestReportInput) {
  return apiClient.post<DataEnvelope<ReportRun>>('/api/v1/reports', input)
}

export async function getDownloadUrl(id: string) {
  return apiClient.get<{ download_url: string; expires_in_seconds: number }>(
    `/api/v1/reports/${id}/download`,
  )
}
