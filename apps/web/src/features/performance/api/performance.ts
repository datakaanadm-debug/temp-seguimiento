import { apiClient } from '@/lib/api-client'
import type {
  DataEnvelope, Evaluation, EvaluationKind, EvaluationStatus,
  PaginatedResponse, Scorecard,
} from '@/types/api'

export async function listScorecards(params: { active_only?: boolean; applicable_to?: string } = {}) {
  return apiClient.get<{ data: Scorecard[] }>('/api/v1/scorecards', { searchParams: params as any })
}

export async function getScorecard(id: string): Promise<DataEnvelope<Scorecard>> {
  return apiClient.get(`/api/v1/scorecards/${id}`)
}

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
