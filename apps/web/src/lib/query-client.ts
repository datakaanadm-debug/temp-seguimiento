'use client'

import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnMount: false,
        retry: (failureCount, error) => {
          const status = (error as ApiError)?.status
          if (status === 401 || status === 403 || status === 404 || status === 422) return false
          return failureCount < 2
        },
      },
      mutations: { retry: 0 },
    },
  })
}
