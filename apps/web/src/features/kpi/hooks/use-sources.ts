'use client'

import { useState, useEffect } from 'react'

export interface SourceOption {
  value: string
  label: string
  count: number
}

interface SourcesResponse {
  sources: SourceOption[]
  totalMembers: number
}

// Simple cache to avoid refetching on every mount
let cachedData: SourcesResponse | null = null
let cacheTime = 0
const CACHE_DURATION = 60000 // 1 minute

export function useSources() {
  const [data, setData] = useState<SourcesResponse | null>(cachedData)
  const [isLoading, setIsLoading] = useState(!cachedData)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Return cached data if still valid
    if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
      setData(cachedData)
      setIsLoading(false)
      return
    }

    async function fetchSources() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/kpi/sources')
        if (!response.ok) {
          throw new Error('Failed to fetch sources')
        }
        const result = await response.json()
        cachedData = result
        cacheTime = Date.now()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchSources()
  }, [])

  return {
    sources: data?.sources ?? [],
    totalMembers: data?.totalMembers ?? 0,
    isLoading,
    error,
  }
}
