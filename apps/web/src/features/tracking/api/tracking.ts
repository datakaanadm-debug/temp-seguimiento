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
