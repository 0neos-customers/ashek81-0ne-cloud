'use client'

import useSWR from 'swr'
import type { SkoolGroupSettings, EmailBlastStatus } from '@0ne/db'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface UseGroupSettingsReturn {
  settings: SkoolGroupSettings | null
  emailBlastStatus: EmailBlastStatus | null
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching group settings including email blast status
 */
export function useGroupSettings(groupSlug = 'fruitful'): UseGroupSettingsReturn {
  const url = `/api/skool/group-settings?group_slug=${encodeURIComponent(groupSlug)}`

  const { data, error, mutate } = useSWR<{
    settings: SkoolGroupSettings
    email_blast_status: EmailBlastStatus
  }>(url, fetcher)

  return {
    settings: data?.settings || null,
    emailBlastStatus: data?.email_blast_status || null,
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}

/**
 * Record that an email blast was sent
 */
export async function recordEmailBlast(
  groupSlug = 'fruitful'
): Promise<{ settings?: SkoolGroupSettings; error?: string }> {
  try {
    const response = await fetch('/api/skool/group-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_slug: groupSlug }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to record email blast' }
    }
    return { settings: data.settings }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
