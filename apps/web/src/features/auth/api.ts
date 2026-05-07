import { apiClient } from '@/lib/api-client'
import { config } from '@/lib/config'
import type { Invitation, MembershipRole, PaginatedResponse, Tenant, User } from '@/types/api'

async function ensureCsrfCookie(): Promise<void> {
  await fetch(`${config.apiUrl.replace(/\/+$/, '')}/sanctum/csrf-cookie`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
}

export interface LoginInput {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterTenantInput {
  slug: string
  name: string
  admin_email: string
  admin_name: string
  admin_password: string
  plan?: 'starter' | 'growth' | 'business' | 'enterprise'
}

export interface AcceptInvitationInput {
  token: string
  email: string
  name: string
  password: string
  timezone?: string
  locale?: string
}

export async function login(input: LoginInput): Promise<{ user: User; tenant: Tenant }> {
  await ensureCsrfCookie()
  return apiClient.post('/api/v1/auth/login', input)
}

export async function logout(): Promise<void> {
  await apiClient.post('/api/v1/auth/logout')
}

export async function registerTenant(input: RegisterTenantInput): Promise<{ tenant: Tenant; message: string }> {
  await ensureCsrfCookie()
  return apiClient.post('/api/v1/tenants/register', input)
}

export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<{ user: User; tenant: Tenant; message: string }> {
  await ensureCsrfCookie()
  return apiClient.post('/api/v1/invitations/accept', input)
}

export interface UpdateTenantInput {
  name?: string
  slug?: string
  data_residency?: 'latam' | 'us' | 'eu'
  plan?: 'starter' | 'growth' | 'business' | 'enterprise'
  theme?: Partial<{ brand_primary: string; brand_dark: string; brand_accent: string }>
  settings?: Partial<{ industry: string; size: string; domain: string | null }>
}

export async function updateTenant(input: UpdateTenantInput): Promise<{ tenant: Tenant }> {
  return apiClient.put('/api/v1/tenant', input)
}

export async function uploadTenantLogo(file: File): Promise<{ tenant: Tenant; logo_url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post('/api/v1/tenant/logo', fd)
}

export async function removeTenantLogo(): Promise<{ tenant: Tenant }> {
  return apiClient.delete('/api/v1/tenant/logo')
}

// ── Roles ─────────────────────────────────────────────────────────────
export interface RoleInfo {
  id: string
  name: string
  description: string
  is_system: boolean
  accent: string | null
  members: number
}

export interface RolePermission {
  cap: string
  roles: string[]
}

export async function getRoles(): Promise<{ data: { roles: RoleInfo[]; permissions: RolePermission[] } }> {
  return apiClient.get('/api/v1/roles')
}

// ── Invitations ───────────────────────────────────────────────────────
export interface InviteUserInput {
  email: string
  role: MembershipRole
  team_id?: string | null
  mentor_id?: string | null
  expires_in_hours?: number
}

export async function listInvitations(
  params: { status?: 'pending' } = {},
): Promise<PaginatedResponse<Invitation>> {
  return apiClient.get('/api/v1/invitations', { searchParams: params })
}

export async function inviteUser(input: InviteUserInput): Promise<{ invitation: Invitation }> {
  return apiClient.post('/api/v1/invitations', input)
}

export async function revokeInvitation(id: string): Promise<{ invitation: Invitation }> {
  return apiClient.delete(`/api/v1/invitations/${id}`)
}
