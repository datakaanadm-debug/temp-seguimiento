import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse } from '@/types/api'

export interface AuditLogEntry {
  id: string
  log_name: string | null
  event: string | null
  description: string | null
  subject: {
    type: string | null
    type_full: string | null
    id: string | null
  }
  causer: {
    type: string | null
    id: string | null
    name?: string | null
    email?: string | null
  }
  properties: Record<string, unknown>
  ip_address: string | null
  request_id: string | null
  created_at: string
}

export interface ListAuditLogParams {
  log_name?: string
  event?: string
  causer_id?: string
  subject_type?: string
  from?: string
  to?: string
  q?: string
  per_page?: number
  page?: number
}

export async function listAuditLog(params: ListAuditLogParams = {}) {
  return apiClient.get<PaginatedResponse<AuditLogEntry>>('/api/v1/audit-log', {
    searchParams: params as any,
  })
}

export async function listAuditLogNames() {
  return apiClient.get<{ data: string[] }>('/api/v1/audit-log/log-names')
}
