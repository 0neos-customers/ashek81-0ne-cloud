'use client'

import useSWR from 'swr'
import type { SkoolCampaign, SkoolCampaignInput, CampaignStats } from '@0ne/db'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface CampaignWithStats extends SkoolCampaign {
  stats?: CampaignStats
}

export interface UseCampaignsOptions {
  includeStats?: boolean
  activeOnly?: boolean
}

export interface UseCampaignsReturn {
  campaigns: CampaignWithStats[]
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching campaigns
 */
export function useCampaigns(options: UseCampaignsOptions = {}): UseCampaignsReturn {
  const params = new URLSearchParams()
  if (options.includeStats) params.set('include_stats', 'true')
  if (options.activeOnly) params.set('active_only', 'true')

  const url = `/api/skool/campaigns${params.toString() ? '?' + params.toString() : ''}`

  const { data, error, mutate } = useSWR<{ campaigns: CampaignWithStats[] }>(url, fetcher)

  return {
    campaigns: data?.campaigns || [],
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  input: SkoolCampaignInput
): Promise<{ campaign?: SkoolCampaign; error?: string }> {
  try {
    const response = await fetch('/api/skool/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create campaign' }
    }
    return { campaign: data.campaign }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  updates: Partial<SkoolCampaign>
): Promise<{ campaign?: SkoolCampaign; error?: string }> {
  try {
    const response = await fetch('/api/skool/campaigns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to update campaign' }
    }
    return { campaign: data.campaign }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/skool/campaigns?id=${id}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete campaign' }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
