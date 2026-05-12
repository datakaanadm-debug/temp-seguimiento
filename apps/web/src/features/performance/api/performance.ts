import { apiClient } from '@/lib/api-client'
import type {
  DataEnvelope, Evaluation, EvaluationKind, EvaluationStatus, MetricType,
  PaginatedResponse, Scorecard,
} from '@/types/api'

// ──────────────────────── Scorecards ────────────────────────

export async function listScorecards(params: { active_only?: boolean; applicable_to?: string } = {}) {
  return apiClient.get<{ data: Scorecard[] }>('/api/v1/scorecards', { searchParams: params as any })
}

export async function getScorecard(id: string): Promise<DataEnvelope<Scorecard>> {
  return apiClient.get(`/api/v1/scorecards/${id}`)
}

export interface ScorecardMetricInput {
  key: string
  label: string
  type: MetricType
  source?: string | null
  target_value?: number | null
  unit?: string | null
  weight?: number
  config?: Record<string, unknown>
  position?: number
}

export interface CreateScorecardInput {
  name: string
  description?: string | null
  applicable_to?: 'intern' | 'mentor' | 'staff'
  metrics: ScorecardMetricInput[]
}

export async function createScorecard(input: CreateScorecardInput) {
  return apiClient.post<DataEnvelope<Scorecard>>('/api/v1/scorecards', input)
}

export interface UpdateScorecardInput {
  name?: string
  description?: string | null
  is_active?: boolean
  /** Si se pasa, reemplaza completamente las métricas (upsert por `key`). */
  metrics?: ScorecardMetricInput[]
}

export async function updateScorecard(id: string, input: UpdateScorecardInput) {
  return apiClient.put<DataEnvelope<Scorecard>>(`/api/v1/scorecards/${id}`, input)
}

export async function deleteScorecard(id: string) {
  return apiClient.delete<{ ok: true }>(`/api/v1/scorecards/${id}`)
}

// ──────────────────────── Evaluations ───────────────────────

export async function listEvaluations(params: {
  subject_user_id?: string
  evaluator_user_id?: string
  status?: EvaluationStatus
  kind?: EvaluationKind
  mine?: boolean
  per_page?: number
} = {}) {
  return apiClient.get<PaginatedResponse<Evaluation>>('/api/v1/evaluations', { searchParams: params as any })
}

export async function getEvaluation(id: string): Promise<DataEnvelope<Evaluation>> {
  return apiClient.get(`/api/v1/evaluations/${id}`)
}

export async function scheduleEvaluation(input: {
  scorecard_id: string
  subject_user_id: string
  evaluator_user_id?: string | null
  kind: EvaluationKind
  scheduled_for: string
}) {
  return apiClient.post<DataEnvelope<Evaluation>>('/api/v1/evaluations', input)
}

export async function saveResponses(
  id: string,
  input: {
    responses: Record<string, { value_numeric?: number | null; value_text?: string | null; value_json?: any }>
    narrative?: string | null
    overall_score?: number | null
  },
) {
  return apiClient.put<DataEnvelope<Evaluation>>(`/api/v1/evaluations/${id}/responses`, input)
}

export async function submitEvaluation(id: string) {
  return apiClient.post<DataEnvelope<Evaluation>>(`/api/v1/evaluations/${id}/submit`)
}

export async function acknowledgeEvaluation(id: string) {
  return apiClient.post<DataEnvelope<Evaluation>>(`/api/v1/evaluations/${id}/acknowledge`)
}

// Lifecycle adicional: dispute / resolve / cancel / assign
export async function disputeEvaluation(id: string, reason?: string | null) {
  return apiClient.post<DataEnvelope<Evaluation>>(`/api/v1/evaluations/${id}/dispute`, { reason })
}

export async function resolveEvaluation(id: string, resolution?: string | null) {
  return apiClient.post<DataEnvelope<Evaluation>>(`/api/v1/evaluations/${id}/resolve`, { resolution })
}

export async function cancelEvaluation(id: string, reason?: string | null) {
  return apiClient.post<DataEnvelope<Evaluation>>(`/api/v1/evaluations/${id}/cancel`, { reason })
}

export async function assignEvaluator(id: string, evaluatorUserId: string | null) {
  return apiClient.patch<DataEnvelope<Evaluation>>(`/api/v1/evaluations/${id}/assign`, {
    evaluator_user_id: evaluatorUserId,
  })
}
