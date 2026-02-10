'use client'

import useSWR from 'swr'
import type { SkoolOneOffPost, SkoolOneOffPostInput, SkoolCampaign } from '@0ne/db'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface OneOffPostWithCampaign extends Omit<SkoolOneOffPost, 'campaign'> {
  campaign?: Pick<SkoolCampaign, 'id' | 'name'> | null
}

export interface UseOneOffPostsOptions {
  campaignId?: string
  status?: string
  upcoming?: boolean
  limit?: number
}

export interface UseOneOffPostsReturn {
  posts: OneOffPostWithCampaign[]
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching one-off posts
 */
export function useOneOffPosts(options: UseOneOffPostsOptions = {}): UseOneOffPostsReturn {
  const params = new URLSearchParams()
  if (options.campaignId) params.set('campaign_id', options.campaignId)
  if (options.status) params.set('status', options.status)
  if (options.upcoming) params.set('upcoming', 'true')
  if (options.limit) params.set('limit', String(options.limit))

  const url = `/api/skool/oneoff-posts${params.toString() ? '?' + params.toString() : ''}`

  const { data, error, mutate } = useSWR<{ posts: OneOffPostWithCampaign[] }>(url, fetcher)

  return {
    posts: data?.posts || [],
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}

/**
 * Create a new one-off post
 */
export async function createOneOffPost(
  input: SkoolOneOffPostInput
): Promise<{ post?: OneOffPostWithCampaign; error?: string }> {
  try {
    const response = await fetch('/api/skool/oneoff-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create one-off post' }
    }
    return { post: data.post }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Update an existing one-off post
 */
export async function updateOneOffPost(
  id: string,
  updates: Partial<SkoolOneOffPost>
): Promise<{ post?: OneOffPostWithCampaign; error?: string }> {
  try {
    const response = await fetch('/api/skool/oneoff-posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to update one-off post' }
    }
    return { post: data.post }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Delete a one-off post
 */
export async function deleteOneOffPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/skool/oneoff-posts?id=${id}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete one-off post' }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
