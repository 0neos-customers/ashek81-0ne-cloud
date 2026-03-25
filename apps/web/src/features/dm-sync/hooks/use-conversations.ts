'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Participant info for a conversation
 */
export interface ConversationParticipant {
  skoolUserId: string
  displayName: string | null
  username: string | null
}

/**
 * Last message preview for a conversation
 */
export interface ConversationLastMessage {
  text: string | null
  direction: 'inbound' | 'outbound'
  createdAt: string
}

/**
 * Conversation summary for list view
 */
export interface Conversation {
  conversationId: string
  participant: ConversationParticipant
  lastMessage: ConversationLastMessage
  messageCount: number
  pendingCount: number
  syncedCount: number
}

/**
 * Summary statistics for all conversations
 */
export interface ConversationsSummary {
  totalConversations: number
  totalPending: number
}

/**
 * Options for the useConversations hook
 */
export interface UseConversationsOptions {
  search?: string
  status?: 'all' | 'pending' | 'synced' | 'failed'
  limit?: number
  enabled?: boolean
}

/**
 * Return type for the useConversations hook
 */
export interface UseConversationsReturn {
  conversations: Conversation[]
  summary: ConversationsSummary
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
  loadMore: () => void
  hasMore: boolean
  offset: number
}

/**
 * Hook for fetching conversation list with search and filtering
 */
export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const { search, status, limit = 50, enabled = true } = options

  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  if (limit) params.set('limit', String(limit))

  const url = `/api/dm-sync/conversations${params.toString() ? '?' + params.toString() : ''}`

  const { data, error, mutate } = useSWR<{
    conversations: Conversation[]
    summary: ConversationsSummary
    pagination: { limit: number; offset: number; hasMore: boolean }
  }>(enabled ? url : null, fetcher, {
    refreshInterval: 10000, // Auto-refresh every 10 seconds
  })

  return {
    conversations: data?.conversations || [],
    summary: data?.summary || {
      totalConversations: 0,
      totalPending: 0,
    },
    isLoading: enabled && !error && !data,
    error,
    refresh: () => mutate(),
    loadMore: () => {
      // Note: For full pagination support, would need to track offset state
      // and merge results. Keeping simple for initial implementation.
      mutate()
    },
    hasMore: data?.pagination?.hasMore || false,
    offset: data?.pagination?.offset || 0,
  }
}
