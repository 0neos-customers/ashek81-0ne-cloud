'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SyncType, SyncStatus } from '@/lib/sync-log'

// =============================================================================
// TYPES
// =============================================================================

export interface SyncLogEntry {
  id: string
  syncType: SyncType
  startedAt: string
  completedAt: string | null
  recordsSynced: number
  status: SyncStatus
  errorMessage: string | null
  metadata: Record<string, unknown> | null
  /** Duration in seconds (null if still running) */
  durationSeconds: number | null
}

export interface SyncLogSummary {
  total: number
  running: number
  completed: number
  failed: number
}

export interface SyncLogResponse {
  logs: SyncLogEntry[]
  summary: SyncLogSummary
  filters: {
    type: string | null
    status: string | null
    limit: number
  }
}

export interface UseSyncLogOptions {
  /** Filter by sync type */
  type?: SyncType
  /** Filter by status */
  status?: SyncStatus
  /** Number of entries to fetch (default: 100) */
  limit?: number
  /** Auto-refresh interval in milliseconds (default: 30000 = 30s, 0 = disabled) */
  refreshInterval?: number
}

export interface UseSyncLogReturn {
  data: SyncLogResponse | null
  isLoading: boolean
  error: Error | null
  /** Manually trigger a refresh */
  mutate: () => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for fetching sync activity log data
 *
 * @example
 * // Basic usage with auto-refresh every 30s
 * const { data, isLoading, error, mutate } = useSyncLog()
 *
 * @example
 * // Filter by type with custom refresh interval
 * const { data } = useSyncLog({
 *   type: 'ghl_contacts',
 *   refreshInterval: 10000
 * })
 *
 * @example
 * // Disable auto-refresh
 * const { data } = useSyncLog({ refreshInterval: 0 })
 */
export function useSyncLog(options: UseSyncLogOptions = {}): UseSyncLogReturn {
  const {
    type,
    status,
    limit = 100,
    refreshInterval = 30000
  } = options

  const [data, setData] = useState<SyncLogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use ref to track mounted state for cleanup
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()

      if (type) {
        params.set('type', type)
      }
      if (status) {
        params.set('status', status)
      }
      if (limit) {
        params.set('limit', String(limit))
      }

      const url = `/api/settings/sync-log?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch sync logs')
      }

      const result = await response.json()

      if (isMountedRef.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [type, status, limit])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    setIsLoading(true)
    fetchData()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return

    const intervalId = setInterval(() => {
      fetchData()
    }, refreshInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [fetchData, refreshInterval])

  // Manual refresh function
  const mutate = useCallback(async () => {
    setIsLoading(true)
    await fetchData()
  }, [fetchData])

  return { data, isLoading, error, mutate }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format sync type for display
 */
export function formatSyncType(syncType: SyncType): string {
  const typeNames: Record<SyncType, string> = {
    ghl_contacts: 'GHL Contacts',
    ghl_payments: 'GHL Payments',
    skool: 'Skool',
    skool_analytics: 'Skool Analytics',
    skool_member_history: 'Skool Member History',
    skool_posts: 'Skool Posts',
    meta: 'Meta Ads',
  }
  return typeNames[syncType] || syncType
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '...'
  if (seconds < 1) return '<1s'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Format date/time for display
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
