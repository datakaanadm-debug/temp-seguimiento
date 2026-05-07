import { apiClient } from '@/lib/api-client'
import type { DataEnvelope } from '@/types/api'

export type TriggerKind =
  | 'blocker.created'
  | 'task.overdue'
  | 'task.state_changed'
  | 'intern.added'
  | 'mentor_session.completed'
  | 'evaluation.submitted'
  | 'schedule.cron'

export interface AutomationAction {
  type: string
  [k: string]: unknown
}

export interface AutomationRule {
  id: string
  title: string
  description: string | null
  trigger_kind: TriggerKind | string
  trigger_config: Record<string, unknown>
  condition_config: Record<string, unknown>
  actions_config: AutomationAction[]
  enabled: boolean
  runs_count: number
  last_run_at: string | null
  created_at: string
}

export interface AutomationTemplate {
  key: string
  title: string
  description: string
  trigger_kind: string
  trigger_config: Record<string, unknown>
  condition_config: Record<string, unknown>
  actions_config: AutomationAction[]
}

export interface AutomationIndexResponse {
  data: AutomationRule[]
  meta: { total: number; active: number; runs_this_month: number }
}

export async function listAutomationRules(): Promise<AutomationIndexResponse> {
  return apiClient.get('/api/v1/automation-rules')
}

export async function listAutomationTemplates(): Promise<{ data: AutomationTemplate[] }> {
  return apiClient.get('/api/v1/automation-templates')
}

export async function toggleAutomationRule(id: string): Promise<DataEnvelope<AutomationRule>> {
  return apiClient.patch(`/api/v1/automation-rules/${id}/toggle`)
}

export interface CreateAutomationRuleInput {
  title: string
  description?: string
  trigger_kind: string
  trigger_config?: Record<string, unknown>
  condition_config?: Record<string, unknown>
  actions_config?: AutomationAction[]
  enabled?: boolean
  template_key?: string
}

export async function createAutomationRule(
  input: CreateAutomationRuleInput,
): Promise<DataEnvelope<AutomationRule>> {
  return apiClient.post('/api/v1/automation-rules', input)
}

export async function deleteAutomationRule(id: string): Promise<{ ok: true }> {
  return apiClient.delete(`/api/v1/automation-rules/${id}`)
}
