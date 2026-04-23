'use client'

import { useQuery } from '@tanstack/react-query'
import { getMyProfile, getProfile, listProfiles } from '../api/people'

export function useProfiles(params: Parameters<typeof listProfiles>[0] = {}) {
  return useQuery({
    queryKey: ['profiles', params],
    queryFn: () => listProfiles(params),
    staleTime: 60_000,
  })
}

export function useProfile(id: string | null | undefined) {
  return useQuery({
    queryKey: ['profiles', 'detail', id],
    queryFn: () => getProfile(id!).then((r) => r.data),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => getMyProfile().then((r) => r.data),
    staleTime: 60_000,
  })
}
