'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface SchedulerCategory {
  id: string | null
  name: string
}

export interface UseCategoriesReturn {
  categories: SchedulerCategory[]
  isLoading: boolean
  error: Error | undefined
  source: 'skool_api' | 'fallback' | undefined
}

/**
 * Hook for fetching Skool community categories
 */
export function useCategories(groupSlug?: string): UseCategoriesReturn {
  const url = groupSlug ? `/api/skool/categories?group=${groupSlug}` : '/api/skool/categories'

  const { data, error } = useSWR<{
    categories: SchedulerCategory[]
    source: 'skool_api' | 'fallback'
  }>(url, fetcher)

  return {
    categories: data?.categories || [],
    isLoading: !error && !data,
    error,
    source: data?.source,
  }
}
