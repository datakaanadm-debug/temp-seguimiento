/**
 * Tipos manuales del MVP. Se reemplazarán por output de openapi-typescript generado
 * desde `services/api` con `dedoc/scramble` cuando el endpoint de OpenAPI esté listo.
 *
 * Para el MVP estas definiciones son la fuente de verdad en frontend.
 */

export type UUID = string
export type ISODate = string
export type ISODateTime = string

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface DataEnvelope<T> {
  data: T
}

// ────────────────────────── Identity ──────────────────────────

export type MembershipRole =
  | 'tenant_admin'
  | 'hr'
  | 'team_lead'
  | 'mentor'
  | 'intern'
  | 'supervisor'
  | 'viewer'

export type TenantPlan = 'starter' | 'growth' | 'business' | 'enterprise'
export type TenantStatus = 'active' | 'trialing' | 'suspended' | 'churned'

export interface Tenant {
  id: UUID
  slug: string
  name: string
  plan: TenantPlan
  status: TenantStatus
  data_residency: 'latam' | 'us' | 'eu'
  settings: {
    ai_enabled: boolean
    gamification_enabled: boolean
    university_reports_enabled: boolean
  }
  theme: Record<string, string>
  trial_ends_at: ISODateTime | null
  created_at: ISODateTime
}

export interface User {
  id: UUID
  email: string
  name: string | null
  avatar_url: string | null
  locale: string
  timezone: string
  email_verified_at: ISODateTime | null
  two_factor_enabled: boolean
  tour_completed_at: ISODateTime | null
  role: MembershipRole | null
  role_label: string | null
  membership_status: string | null
  last_login_at: ISODateTime | null
}

export interface Invitation {
  id: UUID
  email: string
  role: MembershipRole
  role_label: string
  team_id: UUID | null
  mentor_id: UUID | null
  expires_at: ISODateTime
  accepted_at: ISODateTime | null
  revoked_at: ISODateTime | null
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  invited_by: { id: UUID; name?: string | null }
  created_at: ISODateTime
}

// ────────────────────────── Organization ──────────────────────────

export interface Department {
  id: UUID
  name: string
  slug: string
  position: number
  metadata?: Record<string, unknown>
  areas?: Area[]
  created_at: ISODateTime
}

export interface Area {
  id: UUID
  department_id: UUID
  name: string
  slug: string
  position: number
  teams?: Team[]
}

export interface Team {
  id: UUID
  area_id: UUID
  name: string
  slug: string
  color: string
  lead?: {
    id: UUID
    name: string | null
    email: string
    avatar_url: string | null
  } | null
  member_count?: number
  metadata?: Record<string, unknown>
  created_at: ISODateTime
}

export interface TeamMembership {
  id: UUID
  team_id: UUID
  user: {
    id: UUID
    name: string | null
    email: string
    avatar_url: string | null
  }
  role: 'lead' | 'mentor' | 'intern' | 'viewer'
  role_label: string
  joined_at: ISODateTime | null
  left_at: ISODateTime | null
  is_active: boolean
}

// ────────────────────────── People ──────────────────────────

export type ProfileKind = 'intern' | 'mentor' | 'staff' | 'hr' | 'admin'

export interface Profile {
  id: UUID
  user_id: UUID
  kind: ProfileKind
  kind_label: string
  role: MembershipRole | null
  role_label: string | null
  bio: string | null
  position_title: string | null
  start_date: ISODate | null
  end_date: ISODate | null
  hired_at: ISODateTime | null
  skills: string[]
  social_links: Record<string, string>
  user?: User
  intern_data?: InternData
  mentor_data?: MentorData
  phone?: string | null
  birth_date?: ISODate | null
  emergency_contact?: Record<string, unknown>
  national_id?: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface InternData {
  university: string | null
  career: string | null
  semester: number | null
  mandatory_hours: number | null
  hours_completed: number
  progress_percent: number | null
  university_advisor: string | null
  university_email: string | null
  gpa: number | null
}

export interface MentorData {
  expertise: string[]
  max_mentees: number
  availability: Record<string, string>
  certified: boolean
  certified_at: ISODateTime | null
}

export interface MentorAssignment {
  id: UUID
  mentor?: { id: UUID; name: string | null; email: string; avatar_url: string | null }
  intern?: { id: UUID; name: string | null; email: string; avatar_url: string | null }
  status: 'active' | 'ended' | 'paused'
  started_at: ISODateTime
  ended_at: ISODateTime | null
  notes: string | null
}

// ────────────────────────── Tasks ──────────────────────────

export type TaskState = 'BACKLOG' | 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'CANCELLED'
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type ProjectStatus = 'active' | 'paused' | 'archived' | 'completed'

export interface Project {
  id: UUID
  team_id: UUID
  name: string
  slug: string
  description: string | null
  status: ProjectStatus
  color: string | null
  cover_url: string | null
  start_date: ISODate | null
  end_date: ISODate | null
  task_count?: number
  lists?: TaskList[]
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface TaskList {
  id: UUID
  project_id: UUID
  name: string
  position: number
  color: string | null
  wip_limit: number | null
  task_count?: number
}

export interface Task {
  id: UUID
  project_id: UUID
  list_id: UUID | null
  key_result_id: UUID | null
  parent_task_id: UUID | null
  title: string
  description: string | null
  state: TaskState
  state_category: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: TaskPriority
  priority_weight: number
  assignee?: { id: UUID; name: string | null; email: string; avatar_url: string | null } | null
  reviewer?: { id: UUID | null; name: string | null } | null
  due_at: ISODateTime | null
  is_overdue: boolean
  estimated_minutes: number | null
  actual_minutes: number
  position: number
  blocked_reason: string | null
  started_at: ISODateTime | null
  completed_at: ISODateTime | null
  cancelled_at: ISODateTime | null
  subtask_count?: number
  comment_count?: number
  attachment_count?: number
  tags?: Tag[]
  collaborators?: Array<{
    id: UUID
    name: string | null
    email: string
    avatar_url: string | null
    assigned_at: ISODateTime | null
  }>
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Comment {
  id: UUID
  body: string
  mentions: UUID[]
  parent_comment_id: UUID | null
  author?: { id: UUID; name: string | null; email: string; avatar_url: string | null }
  edited_at: ISODateTime | null
  created_at: ISODateTime
}

export interface Attachment {
  id: UUID
  original_name: string
  mime_type: string
  size_bytes: number
  is_image: boolean
  download_url: string
  uploaded_by: UUID
  uploader?: { id: UUID; name: string | null }
  created_at: ISODateTime
}

export type TimeEntrySource = 'timer' | 'manual' | 'auto'

export interface TimeEntry {
  id: UUID
  task_id: UUID
  user_id: UUID
  started_at: ISODateTime
  ended_at: ISODateTime | null
  duration_minutes: number | null
  is_running: boolean
  note: string | null
  source: TimeEntrySource
  created_at: ISODateTime
}

export interface Tag {
  id: UUID
  name: string
  slug: string
  color: string
}

// ────────────────────────── Tracking ──────────────────────────

export type DailyReportStatus = 'draft' | 'submitted' | 'reviewed'
export type Mood = 'great' | 'good' | 'ok' | 'stressed' | 'blocked'

export interface DailyReport {
  id: UUID
  user_id: UUID
  user?: { id: UUID; name: string | null; avatar_url: string | null }
  report_date: ISODate
  status: DailyReportStatus
  progress_summary: string
  blockers_text: string | null
  plan_tomorrow: string | null
  mood: Mood | null
  hours_worked: number | null
  submitted_at: ISODateTime | null
  reviewed_at: ISODateTime | null
  reviewed_by: UUID | null
  ai_summary_id: UUID | null
  blockers?: Blocker[]
  created_at: ISODateTime
}

export type BlockerSeverity = 'low' | 'medium' | 'high' | 'critical'
export type BlockerStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed'

export interface Blocker {
  id: UUID
  title: string
  description: string | null
  severity: BlockerSeverity
  severity_weight: number
  status: BlockerStatus
  is_active: boolean
  related_task_id: UUID | null
  daily_report_id: UUID | null
  raised_by: UUID
  raiser?: { id: UUID; name: string | null; avatar_url: string | null }
  resolution: string | null
  resolved_by: UUID | null
  resolved_at: ISODateTime | null
  created_at: ISODateTime
}

// ────────────────────────── Notifications ──────────────────────────

export type NotificationChannel = 'in_app' | 'email' | 'push'
export type NotificationCategory =
  | 'task_assigned'
  | 'task_mentioned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'comment_mentioned'
  | 'blocker_raised'
  | 'evaluation_scheduled'
  | 'evaluation_submitted'
  | 'daily_digest'
  | 'weekly_digest'
export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'never'

export interface AppNotification {
  id: UUID
  type: string
  data: Record<string, unknown> & {
    category?: NotificationCategory
    title?: string
    body?: string
  }
  read_at: ISODateTime | null
  created_at: ISODateTime
}

export interface NotificationPreference {
  channel: NotificationChannel
  category: NotificationCategory
  enabled: boolean
  frequency: NotificationFrequency
  quiet_hours: { start: string; end: string } | null
}

// ────────────────────────── Performance ──────────────────────────

export type EvaluationKind = '30d' | '60d' | '90d' | 'adhoc' | '360' | 'onboarding' | 'offboarding'
export type EvaluationStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'CANCELLED'

export type MetricType = 'auto' | 'manual' | 'likert' | 'rubric'

export interface Scorecard {
  id: UUID
  name: string
  description: string | null
  applicable_to: 'intern' | 'mentor' | 'staff'
  is_active: boolean
  metrics?: ScorecardMetric[]
  metric_count?: number
  created_at: ISODateTime
}

export interface ScorecardMetric {
  id: UUID
  key: string
  label: string
  type: MetricType
  source: string | null
  target_value: number | null
  unit: string | null
  weight: number
  config: Record<string, unknown>
  position: number
}

export interface Evaluation {
  id: UUID
  scorecard_id: UUID
  subject_user_id: UUID
  evaluator_user_id: UUID | null
  subject?: { id: UUID; name: string | null; email: string; avatar_url: string | null }
  evaluator?: { id: UUID | null; name: string | null; avatar_url: string | null } | null
  kind: EvaluationKind
  kind_label: string
  status: EvaluationStatus
  scheduled_for: ISODate | null
  started_at: ISODateTime | null
  submitted_at: ISODateTime | null
  signed_at: ISODateTime | null
  acknowledged_at: ISODateTime | null
  overall_score: number | null
  narrative: string | null
  ai_draft_narrative: string | null
  scorecard?: Scorecard
  responses?: EvaluationResponse[]
  created_at: ISODateTime
}

export interface EvaluationResponse {
  id: UUID
  metric_id: UUID
  value_numeric: number | null
  value_text: string | null
  value_json: Record<string, unknown> | null
  auto_value: number | null
  metric?: ScorecardMetric
}

// ────────────────────────── Reports ──────────────────────────

export type ReportKind = 'university' | 'executive' | 'team' | 'intern' | 'custom'
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'expired'

export interface ReportTemplate {
  id: UUID
  kind: ReportKind
  kind_label: string
  name: string
  config: Record<string, unknown>
  layout: string
  is_system: boolean
  created_at: ISODateTime
}

export interface ReportRun {
  id: UUID
  template_id: UUID
  template?: ReportTemplate
  requested_by: UUID
  subject_type: string | null
  subject_id: UUID | null
  period_start: ISODate | null
  period_end: ISODate | null
  parameters: Record<string, unknown> | null
  status: RunStatus
  file_size_bytes: number | null
  download_url?: string
  error_message: string | null
  started_at: ISODateTime | null
  completed_at: ISODateTime | null
  expires_at: ISODateTime | null
  created_at: ISODateTime
}

// ────────────────────────── AI ──────────────────────────

export type SummaryKind = 'daily' | 'weekly' | 'task' | 'evaluation' | 'session' | 'project'

export interface AiSummary {
  id: UUID
  subject_type: string
  subject_id: UUID
  kind: SummaryKind
  model: string
  content: string
  approved: boolean
  approved_at: ISODateTime | null
  created_at: ISODateTime
}

export type InsightKind =
  | 'risk_of_delay'
  | 'pattern_blocked'
  | 'low_activity'
  | 'standout'
  | 'evaluation_risk'
  | 'dropout_risk'
  | 'mentor_match_suggestion'

export type InsightSeverity = 'info' | 'warning' | 'critical'

export interface AiInsight {
  id: UUID
  subject_type: string
  subject_id: UUID
  kind: InsightKind
  kind_label: string
  severity: InsightSeverity
  severity_weight: number
  title: string
  description: string | null
  evidence: Record<string, unknown> | null
  confidence: number | null
  dismissed_at: ISODateTime | null
  acknowledged_at: ISODateTime | null
  resolved_at: ISODateTime | null
  is_active: boolean
  created_at: ISODateTime
}
