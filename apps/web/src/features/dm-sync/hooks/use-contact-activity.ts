'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Contact activity data returned from the API
 */
export interface ContactChannelInfo {
  staffSkoolId: string
  skoolChannelId: string
  staffDisplayName: string | null
}

export interface ContactActivity {
  id: string
  skoolUserId: string
  skoolUsername: string | null
  skoolDisplayName: string | null
  ghlContactId: string | null
  matchMethod: 'skool_id' | 'email' | 'name' | 'synthetic' | 'manual' | 'no_email' | null
  email: string | null
  phone: string | null
  contactType: 'community_member' | 'dm_contact' | 'unknown' | null
  createdAt: string
  skoolConversationId: string | null
  channels: ContactChannelInfo[]
  stats: {
    inboundCount: number
    outboundCount: number
    syncedCount: number
    pendingCount: number
    failedCount: number
    lastActivityAt: string | null
  }
  surveyAnswers: Array<{ question: string; answer: string }> | null
  ghlLocationId: string
  skoolCommunitySlug: string
}

/**
 * Summary statistics for contacts
 */
export interface ContactActivitySummary {
  totalContacts: number
  matchedContacts: number
  unmatchedContacts: number
  totalMessages: number
  contactsWithPending: number
  contactsWithFailed: number
}

/**
 * Options for the useContactActivity hook
 */
export interface UseContactActivityOptions {
  search?: string
  matchMethod?: string
  matchStatus?: string
  status?: string
  limit?: number
  offset?: number
}

/**
 * Return type for the useContactActivity hook
 */
export interface UseContactActivityReturn {
  contacts: ContactActivity[]
  summary: ContactActivitySummary
  total: number
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching contact sync activity
 */
export function useContactActivity(
  options: UseContactActivityOptions = {}
): UseContactActivityReturn {
  const params = new URLSearchParams()

  if (options.search) params.set('search', options.search)
  if (options.matchMethod && options.matchMethod !== 'all') {
    params.set('match_method', options.matchMethod)
  }
  if (options.status && options.status !== 'all') {
    params.set('status', options.status)
  }
  if (options.matchStatus && options.matchStatus !== 'all') {
    params.set('match_status', options.matchStatus)
  }
  if (options.limit) params.set('limit', String(options.limit))
  if (options.offset) params.set('offset', String(options.offset))

  const url = `/api/dm-sync/contacts${params.toString() ? '?' + params.toString() : ''}`

  const { data, error, mutate } = useSWR<{
    contacts: ContactActivity[]
    summary: ContactActivitySummary
    total: number
  }>(url, fetcher, {
    refreshInterval: 30000, // Auto-refresh every 30 seconds
  })

  return {
    contacts: data?.contacts || [],
    summary: data?.summary || {
      totalContacts: 0,
      matchedContacts: 0,
      unmatchedContacts: 0,
      totalMessages: 0,
      contactsWithPending: 0,
      contactsWithFailed: 0,
    },
    total: data?.total || 0,
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}
