'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CRON_REGISTRY,
  type CronJob,
  type CronJobWithStatus,
} from '../lib/cron-registry'
import type { SyncType, SyncStatus } from '@/lib/sync-log'

// =============================================================================
// TYPES
// =============================================================================

interface LastRunInfo {
  startedAt: string
  status: SyncStatus
  recordsSynced: number
  durationSeconds: number | null
  errorMessage: string | null
}

interface LastRunResponse {
  lastRuns: Record<SyncType, LastRunInfo | null>
}

export interface UseSchedulesReturn {
  /** All crons with their last run status */
  schedules: CronJobWithStatus[]
  /** Whether initial data is loading */
  isLoading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Map of cron ID to loading state (for Run Now buttons) */
  runningCrons: Record<string, boolean>
  /** Trigger a manual sync */
  runSync: (cronId: string) => Promise<{ success: boolean; error?: string }>
  /** Manually refresh data */
  refresh: () => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing sync schedules and triggering manual syncs
 *
 * @example
 * const { schedules, isLoading, runningCrons, runSync } = useSchedules()
 *
 * // Trigger a sync
 * const result = await runSync('sync-ghl')
 * if (result.success) {
 *   toast.success('Sync started!')
 * }
 */
export function useSchedules(): UseSchedulesReturn {
  const [lastRuns, setLastRuns] = useState<Record<SyncType, LastRunInfo | null>>({} as Record<SyncType, LastRunInfo | null>)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [runningCrons, setRunningCrons] = useState<Record<string, boolean>>({})

  // Track mounted state for cleanup
  const isMountedRef = useRef(true)

  // Fetch last run info for all cron types
  const fetchLastRuns = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/sync-log/last-runs')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch last runs')
      }

      const data: LastRunResponse = await response.json()

      if (isMountedRef.current) {
        setLastRuns(data.lastRuns)
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
  }, [])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    setIsLoading(true)
    fetchLastRuns()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchLastRuns])

  // Build schedules with status
  const schedules: CronJobWithStatus[] = CRON_REGISTRY.map((cron) => ({
    ...cron,
    lastRun: lastRuns[cron.syncType] || null,
  }))

  // Trigger a manual sync
  const runSync = useCallback(
    async (cronId: string): Promise<{ success: boolean; error?: string }> => {
      // Find the cron
      const cron = CRON_REGISTRY.find((c) => c.id === cronId)
      if (!cron) {
        return { success: false, error: `Unknown cron: ${cronId}` }
      }

      // Set loading state for this cron
      setRunningCrons((prev) => ({ ...prev, [cronId]: true }))

      try {
        const response = await fetch('/api/settings/run-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sync_type: cron.syncType }),
        })

        const data = await response.json()

        if (!response.ok) {
          return { success: false, error: data.error || 'Failed to trigger sync' }
        }

        // Refresh last runs after a short delay to pick up the new running status
        setTimeout(() => {
          fetchLastRuns()
        }, 1000)

        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      } finally {
        // Clear loading state for this cron
        if (isMountedRef.current) {
          setRunningCrons((prev) => ({ ...prev, [cronId]: false }))
        }
      }
    },
    [fetchLastRuns]
  )

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchLastRuns()
  }, [fetchLastRuns])

  return {
    schedules,
    isLoading,
    error,
    runningCrons,
    runSync,
    refresh,
  }
}
