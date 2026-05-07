import { apiClient } from '@/lib/api-client'
import type { Blocker, DailyReport, DataEnvelope, PaginatedResponse } from '@/types/api'

export async function getTodayReport(): Promise<DataEnvelope<DailyReport | null>> {
  return apiClient.get('/api/v1/daily-reports/today')
}

export async function listDailyReports(params: {
  user_id?: string
  from?: string
  to?: string
  status?: string
  per_page?: number
} = {}): Promise<PaginatedResponse<DailyReport>> {
  return apiClient.get('/api/v1/daily-reports', { searchParams: params as any })
}

export async function getDailyReport(id: string): Promise<DataEnvelope<DailyReport>> {
  return apiClient.get(`/api/v1/daily-reports/${id}`)
}

export interface UpsertDailyReportInput {
  report_date?: string
  progress_summary: string
  blockers_text?: string | null
  plan_tomorrow?: string | null
  mood?: 'great' | 'good' | 'ok' | 'stressed' | 'blocked' | null
  hours_worked?: number | null
  submit?: boolean
}

export async function upsertDailyReport(input: UpsertDailyReportInput): Promise<DataEnvelope<DailyReport>> {
  return apiClient.put('/api/v1/daily-reports', input)
}

export async function reviewDailyReport(id: string): Promise<DataEnvelope<DailyReport>> {
  return apiClient.post(`/api/v1/daily-reports/${id}/review`)
}

// ─── Daily report attachments ───
export interface DailyReportAttachment {
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

export async function listDailyReportAttachments(reportId: string): Promise<{ data: DailyReportAttachment[] }> {
  return apiClient.get(`/api/v1/daily-reports/${reportId}/attachments`)
}

export async function uploadDailyReportAttachment(reportId: string, file: File): Promise<DataEnvelope<DailyReportAttachment>> {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post(`/api/v1/daily-reports/${reportId}/attachments`, fd)
}

export async function deleteDailyReportAttachment(attachmentId: string): Promise<{ ok: true }> {
  return apiClient.delete(`/api/v1/daily-reports/attachments/${attachmentId}`)
}

// ─── Blockers ───
export async function listBlockers(params: { status?: string; severity?: string } = {}) {
  return apiClient.get<PaginatedResponse<Blocker>>('/api/v1/blockers', { searchParams: params as any })
}

export interface RaiseBlockerInput {
  title: string
  description?: string | null
  severity?: 'low' | 'medium' | 'high' | 'critical'
  related_task_id?: string | null
  daily_report_id?: string | null
}

export async function raiseBlocker(input: RaiseBlockerInput) {
  return apiClient.post<DataEnvelope<Blocker>>('/api/v1/blockers', input)
}

export async function resolveBlocker(id: string, resolution: string, dismiss = false) {
  return apiClient.post<DataEnvelope<Blocker>>(`/api/v1/blockers/${id}/resolve`, { resolution, dismiss })
}
