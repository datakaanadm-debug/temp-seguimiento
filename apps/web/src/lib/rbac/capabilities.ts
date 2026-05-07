import type { MembershipRole } from '@/types/api'

/**
 * Matriz de capacidades espejo de `App\Modules\Identity\Http\Controllers\RolesController::PERMISSIONS`.
 * Mantener ambos en sync cuando se agreguen/quiten permisos.
 */
export type Capability =
  | 'invite_users'
  | 'view_all_interns'
  | 'create_evaluations'
  | 'mentor_private_notes'
  | 'create_automations'
  | 'view_global_analytics'
  | 'university_report'
  | 'configure_billing'
  | 'view_audit_log'
  | 'edit_company'
  // Extendidas para M11 (no expuestas en API aún, derivables del role)
  | 'create_tasks'
  | 'create_projects'
  | 'create_okr'
  | 'create_mentor_session'
  | 'manage_onboarding_template'
  | 'upload_attachments'

export const CAPABILITY_MATRIX: Record<Capability, MembershipRole[]> = {
  // Supervisor es un rol read-only: ve analítica/dashboards/reportes pero no crea nada.
  invite_users: ['tenant_admin', 'hr', 'team_lead'],
  view_all_interns: ['tenant_admin', 'hr', 'supervisor'],
  create_evaluations: ['tenant_admin', 'hr', 'team_lead'],
  mentor_private_notes: ['mentor'],
  create_automations: ['tenant_admin', 'hr'],
  view_global_analytics: ['tenant_admin', 'hr', 'team_lead', 'supervisor'],
  university_report: ['tenant_admin', 'hr', 'intern', 'supervisor'],
  configure_billing: ['tenant_admin'],
  view_audit_log: ['tenant_admin', 'supervisor'],
  edit_company: ['tenant_admin'],
  create_tasks: ['tenant_admin', 'hr', 'team_lead', 'mentor', 'intern'],
  create_projects: ['tenant_admin', 'hr', 'team_lead'],
  create_okr: ['tenant_admin', 'hr', 'team_lead', 'intern'],
  create_mentor_session: ['tenant_admin', 'hr', 'mentor'],
  manage_onboarding_template: ['tenant_admin', 'hr'],
  upload_attachments: ['tenant_admin', 'hr', 'team_lead', 'mentor', 'intern'],
}

export function roleHasCapability(role: MembershipRole | null | undefined, cap: Capability): boolean {
  if (!role) return false
  return CAPABILITY_MATRIX[cap]?.includes(role) ?? false
}
