import { apiClient } from '@/lib/api-client'
import type {
  DataEnvelope, PaginatedResponse, Project, Task, TaskList, TaskPriority, TaskState,
  Comment, Attachment, TimeEntry, Tag,
} from '@/types/api'
import type { ListTasksParams } from './keys'

export async function listTasks(params: ListTasksParams = {}): Promise<PaginatedResponse<Task>> {
  const sp: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp[k] = v as any
  }
  return apiClient.get('/api/v1/tasks', { searchParams: sp })
}

export async function getTask(id: string): Promise<DataEnvelope<Task>> {
  return apiClient.get(`/api/v1/tasks/${id}`)
}

export interface CreateTaskInput {
  project_id: string
  list_id?: string | null
  parent_task_id?: string | null
  key_result_id?: string | null
  title: string
  description?: string | null
  priority?: TaskPriority
  assignee_id?: string | null
  reviewer_id?: string | null
  due_at?: string | null
  estimated_minutes?: number | null
  tag_ids?: string[]
  collaborator_ids?: string[]
}

export async function createTask(input: CreateTaskInput): Promise<DataEnvelope<Task>> {
  return apiClient.post('/api/v1/tasks', input)
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  priority?: TaskPriority
  assignee_id?: string | null
  reviewer_id?: string | null
  due_at?: string | null
  estimated_minutes?: number | null
  list_id?: string | null
  key_result_id?: string | null
  position?: number
  tag_ids?: string[]
  collaborator_ids?: string[]
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<DataEnvelope<Task>> {
  return apiClient.patch(`/api/v1/tasks/${id}`, input)
}

export async function changeTaskState(
  id: string,
  state: TaskState,
  reason?: string,
): Promise<DataEnvelope<Task>> {
  return apiClient.post(`/api/v1/tasks/${id}/state`, { state, reason })
}

export async function deleteTask(id: string): Promise<{ ok: true }> {
  return apiClient.delete(`/api/v1/tasks/${id}`)
}

// ─── Projects ───
export async function listProjects(params: { team_id?: string; status?: string } = {}) {
  return apiClient.get<PaginatedResponse<Project>>('/api/v1/projects', { searchParams: params })
}
export async function getProject(id: string): Promise<DataEnvelope<Project>> {
  return apiClient.get(`/api/v1/projects/${id}`)
}

export interface CreateProjectInput {
  team_id: string
  name: string
  slug: string
  description?: string | null
  color?: string | null
  start_date?: string | null
  end_date?: string | null
  with_default_lists?: boolean
}
export async function createProject(input: CreateProjectInput): Promise<DataEnvelope<Project>> {
  return apiClient.post('/api/v1/projects', input)
}

export interface UpdateProjectInput {
  name?: string
  description?: string | null
  status?: 'active' | 'paused' | 'completed' | 'archived'
  color?: string | null
  start_date?: string | null
  end_date?: string | null
}
export async function updateProject(id: string, input: UpdateProjectInput): Promise<DataEnvelope<Project>> {
  return apiClient.patch(`/api/v1/projects/${id}`, input)
}

// ─── Lists (columnas Kanban) ───
export async function listProjectLists(projectId: string): Promise<{ data: TaskList[] }> {
  return apiClient.get(`/api/v1/projects/${projectId}/lists`)
}
export async function reorderLists(projectId: string, listIds: string[]) {
  return apiClient.post<{ data: TaskList[] }>(`/api/v1/projects/${projectId}/lists/reorder`, {
    list_ids: listIds,
  })
}

// ─── Comments ───
export async function listComments(taskId: string): Promise<PaginatedResponse<Comment>> {
  return apiClient.get(`/api/v1/tasks/${taskId}/comments`)
}
export async function addComment(taskId: string, body: string, parent_comment_id?: string | null) {
  return apiClient.post<DataEnvelope<Comment>>(`/api/v1/tasks/${taskId}/comments`, {
    body,
    parent_comment_id,
  })
}

export async function updateComment(commentId: string, body: string) {
  return apiClient.patch<DataEnvelope<Comment>>(`/api/v1/comments/${commentId}`, { body })
}

export async function deleteComment(commentId: string) {
  return apiClient.delete<{ ok: true }>(`/api/v1/comments/${commentId}`)
}

// ─── Attachments ───
export async function listAttachments(taskId: string): Promise<{ data: Attachment[] }> {
  return apiClient.get(`/api/v1/tasks/${taskId}/attachments`)
}

/** Upload directo multipart (para dev con disk local). */
export async function uploadTaskAttachment(taskId: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post<DataEnvelope<Attachment>>(`/api/v1/tasks/${taskId}/attachments/upload`, fd)
}

export async function deleteAttachment(attachmentId: string) {
  return apiClient.delete<{ ok: true }>(`/api/v1/attachments/${attachmentId}`)
}

export async function presignAttachmentUpload(
  taskId: string,
  input: { original_name: string; content_type: string; size_bytes: number },
) {
  return apiClient.post<{
    upload_url: string
    stored_key: string
    headers: Record<string, string>
    max_bytes: number
  }>(`/api/v1/tasks/${taskId}/attachments/presign`, input)
}

export async function registerAttachment(
  taskId: string,
  input: {
    stored_key: string
    original_name: string
    mime_type: string
    size_bytes: number
    checksum_sha256?: string
  },
) {
  return apiClient.post<DataEnvelope<Attachment>>(`/api/v1/tasks/${taskId}/attachments`, input)
}

// ─── Time entries ───
export async function listTimeEntries(taskId: string): Promise<PaginatedResponse<TimeEntry>> {
  return apiClient.get(`/api/v1/tasks/${taskId}/time-entries`)
}
export async function startTimer(taskId: string, note?: string | null) {
  return apiClient.post<DataEnvelope<TimeEntry>>(`/api/v1/tasks/${taskId}/time-entries/start`, { note })
}
export async function stopTimer(entryId: string, note?: string | null) {
  return apiClient.post<DataEnvelope<TimeEntry>>(`/api/v1/time-entries/${entryId}/stop`, { note })
}
export async function getRunningTimer() {
  return apiClient.get<{ data: TimeEntry | null }>('/api/v1/time-entries/running')
}
export async function addManualTimeEntry(
  taskId: string,
  input: { started_at: string; ended_at: string; note?: string | null },
) {
  return apiClient.post<DataEnvelope<TimeEntry>>(`/api/v1/tasks/${taskId}/time-entries/manual`, input)
}

// ─── Tags ───
export async function listTags(): Promise<{ data: Tag[] }> {
  return apiClient.get('/api/v1/tags')
}
