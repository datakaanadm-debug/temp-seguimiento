import { apiClient } from '@/lib/api-client'
import type { DataEnvelope } from '@/types/api'

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface BadgeCatalogItem {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  tier: BadgeTier
  points: number
  kind: string
}

export interface UserBadge {
  id: string
  badge_id: string
  badge: {
    id: string
    name: string
    description: string
    icon: string
    tier: BadgeTier
  } | null
  progress_percent: number
  earned: boolean
  earned_at: string | null
}

export interface LeaderboardRow {
  user_id: string
  name: string | null
  email: string
  area: string | null
  total_points: number
  streak_days: number
  level: string
  badge_count: number
}

export interface WallEntry {
  id: string
  user_id: string
  user_name: string | null
  badge_name: string
  badge_tier: BadgeTier
  badge_icon: string
  earned_at: string
}

export interface MyStats {
  level: string
  total_points: number
  streak_days: number
  best_streak: number
  earned_badges: number
  in_progress_badges: number
  leaderboard_position: number
}

export async function listBadges(): Promise<{ data: BadgeCatalogItem[] }> {
  return apiClient.get('/api/v1/badges')
}

export async function getUserBadges(userId?: string): Promise<{ data: UserBadge[] }> {
  return apiClient.get('/api/v1/user-badges', {
    searchParams: userId ? { user_id: userId } : undefined,
  })
}

export async function getLeaderboard(): Promise<{ data: LeaderboardRow[] }> {
  return apiClient.get('/api/v1/leaderboard')
}

export async function getWall(): Promise<{ data: WallEntry[] }> {
  return apiClient.get('/api/v1/gamification/wall')
}

export async function getMyStats(userId?: string): Promise<DataEnvelope<MyStats>> {
  return apiClient.get('/api/v1/gamification/me', {
    searchParams: userId ? { user_id: userId } : undefined,
  })
}
