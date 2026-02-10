'use client'

import useSWR from 'swr'
import type { SkoolVariationGroup, SkoolVariationGroupInput } from '@0ne/db'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface VariationGroupWithStats extends SkoolVariationGroup {
  post_count?: number
  scheduler_count?: number
}

export interface UseVariationGroupsReturn {
  groups: VariationGroupWithStats[]
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching variation groups
 */
export function useVariationGroups(includeStats = false): UseVariationGroupsReturn {
  const url = `/api/skool/variation-groups${includeStats ? '?include_stats=true' : ''}`

  const { data, error, mutate } = useSWR<{ groups: VariationGroupWithStats[] }>(url, fetcher)

  return {
    groups: data?.groups || [],
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}

export interface UseVariationGroupReturn {
  group: VariationGroupWithStats | null
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching a single variation group by ID
 */
export function useVariationGroup(id: string | null): UseVariationGroupReturn {
  const url = id ? `/api/skool/variation-groups/${id}` : null

  const { data, error, mutate } = useSWR<{ group: VariationGroupWithStats }>(url, fetcher)

  return {
    group: data?.group || null,
    isLoading: !!id && !error && !data,
    error,
    refresh: mutate,
  }
}

/**
 * Create a new variation group
 */
export async function createVariationGroup(
  input: SkoolVariationGroupInput
): Promise<{ group?: SkoolVariationGroup; error?: string }> {
  try {
    const response = await fetch('/api/skool/variation-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create variation group' }
    }
    return { group: data.group }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Update an existing variation group
 */
export async function updateVariationGroup(
  id: string,
  updates: Partial<SkoolVariationGroup>
): Promise<{ group?: SkoolVariationGroup; error?: string }> {
  try {
    const response = await fetch('/api/skool/variation-groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to update variation group' }
    }
    return { group: data.group }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Delete a variation group
 */
export async function deleteVariationGroup(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/skool/variation-groups?id=${id}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete variation group' }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
