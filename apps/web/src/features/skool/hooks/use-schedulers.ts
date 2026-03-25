'use client'

import useSWR from 'swr'
import type { SkoolScheduledPost } from '@0ne/db'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface UseSchedulersReturn {
  schedulers: SkoolScheduledPost[]
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching and managing Skool post schedulers
 */
export function useSchedulers(): UseSchedulersReturn {
  const { data, error, mutate } = useSWR<{ schedulers: SkoolScheduledPost[] }>(
    '/api/skool/schedulers',
    fetcher
  )

  return {
    schedulers: data?.schedulers || [],
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}

/**
 * Create a new scheduler slot
 */
export async function createScheduler(
  input: Omit<SkoolScheduledPost, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt'>
): Promise<{ scheduler?: SkoolScheduledPost; error?: string }> {
  try {
    const response = await fetch('/api/skool/schedulers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create scheduler' }
    }
    return { scheduler: data.scheduler }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Update an existing scheduler slot
 */
export async function updateScheduler(
  id: string,
  updates: Partial<SkoolScheduledPost>
): Promise<{ scheduler?: SkoolScheduledPost; error?: string }> {
  try {
    const response = await fetch('/api/skool/schedulers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to update scheduler' }
    }
    return { scheduler: data.scheduler }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Delete a scheduler slot
 */
export async function deleteScheduler(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/skool/schedulers?id=${id}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete scheduler' }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
