'use client'

import useSWR from 'swr'
import type { SkoolPostExecutionLog, SchedulerExecutionStatus } from '@0ne/db'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface ExecutionLogWithJoins extends SkoolPostExecutionLog {
  scheduler?: { category: string; day_of_week: number; time: string } | null
  post?: { title: string } | null
}

export interface ExecutionLogOptions {
  limit?: number
  offset?: number
  status?: SchedulerExecutionStatus
  scheduler_id?: string
}

export interface UseExecutionLogReturn {
  logs: ExecutionLogWithJoins[]
  total: number
  hasMore: boolean
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching execution log with pagination and filters
 */
export function useExecutionLog(options?: ExecutionLogOptions): UseExecutionLogReturn {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.offset) params.set('offset', String(options.offset))
  if (options?.status) params.set('status', options.status)
  if (options?.scheduler_id) params.set('scheduler_id', options.scheduler_id)

  const url = `/api/skool/execution-log?${params.toString()}`

  const { data, error, mutate } = useSWR<{
    logs: ExecutionLogWithJoins[]
    total: number
    hasMore: boolean
  }>(url, fetcher)

  return {
    logs: data?.logs || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}
