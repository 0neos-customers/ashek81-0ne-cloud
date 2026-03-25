'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface FixAction {
  checkName: string
  category: string
  beforeStatus: string
  beforeDetail: string
  actionTaken: string
  afterStatus: string
  afterDetail: string
  success: boolean
  error?: string
}

export interface FixSummary {
  fixesAttempted: number
  fixesSucceeded: number
  fixesFailed: number
}

export interface TelemetryEvent {
  id: string
  eventType: 'doctor' | 'install'
  principalName: string | null
  platform: string | null
  arch: string | null
  osVersion: string | null
  bunVersion: string | null
  oneVersion: string | null
  summary: {
    pass?: number
    fail?: number
    warn?: number
    skip?: number
    total?: number
  } | null
  results: Record<string, unknown>[] | null
  systemInfo: Record<string, unknown> | null
  fixActions: FixAction[] | null
  fixSummary: FixSummary | null
  status: 'new' | 'triaged' | 'fixed' | 'deployed'
  fixNotes: string | null
  fixCommit: string | null
  triagedAt: string | null
  fixedAt: string | null
  deployedAt: string | null
  createdAt: string
}

export interface StatusHistoryEntry {
  id: string
  eventId: string
  oldStatus: string | null
  newStatus: string
  note: string | null
  createdAt: string
}

export interface TelemetryEventDetail {
  event: TelemetryEvent
  statusHistory: StatusHistoryEntry[]
}

export interface TelemetryStats {
  totalInstalls: number
  totalDoctorRuns: number
  successRate: number
  avgIssues: number
  totalFixes: number
}

export interface InstallsFilters {
  eventType?: string
  platform?: string
  status?: string
  principalName?: string
  dateFrom?: string
  dateTo?: string
}

export interface PaginatedResponse {
  data: TelemetryEvent[]
  total: number
  page: number
  perPage: number
}

export interface FailurePattern {
  id: string
  patternKey: string
  failureName: string
  category: string | null
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  knownFix: string | null
  autoFixable: boolean
  updatedAt: string
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for fetching installs stats (aggregate metrics)
 */
export function useInstallsStats() {
  const [data, setData] = useState<TelemetryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/installs/dashboard/stats')
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to fetch stats')
        }
        const result = await response.json()
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  return { data, isLoading, error }
}

/**
 * Hook for fetching paginated installs events with filters
 */
export function useInstallsEvents(filters: InstallsFilters = {}, page = 1, perPage = 25) {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(perPage))

      if (filters.eventType) params.set('event_type', filters.eventType)
      if (filters.platform) params.set('platform', filters.platform)
      if (filters.status) params.set('status', filters.status)
      if (filters.principalName) params.set('principal_name', filters.principalName)
      if (filters.dateFrom) params.set('date_from', filters.dateFrom)
      if (filters.dateTo) params.set('date_to', filters.dateTo)

      const response = await fetch(`/api/installs/dashboard?${params.toString()}`)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch events')
      }
      const result: PaginatedResponse = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [page, perPage, filters.eventType, filters.platform, filters.status, filters.principalName, filters.dateFrom, filters.dateTo])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { data, isLoading, error, refetch: fetchEvents }
}

// =============================================================================
// DETAIL HOOKS
// =============================================================================

/**
 * Hook for fetching a single telemetry event with status history
 */
export function useInstallEvent(id: string) {
  const [data, setData] = useState<TelemetryEventDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvent = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/installs/dashboard/${id}`)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch event')
      }
      const result: TelemetryEventDetail = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchEvent()
  }, [id, fetchEvent])

  return { data, isLoading, error, refetch: fetchEvent }
}

/**
 * Hook for updating event status (triage, fix, deploy)
 */
export function useUpdateStatus(id: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateStatus = useCallback(async (payload: {
    status: 'triaged' | 'fixed' | 'deployed'
    note?: string
    fix_commit?: string
    fix_notes?: string
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/installs/dashboard/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update status')
      }
      const result = await response.json()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [id])

  return { updateStatus, isLoading, error }
}

/**
 * Hook for adding a note to an event
 */
export function useAddNote(id: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const addNote = useCallback(async (note: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/installs/dashboard/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to add note')
      }
      const result = await response.json()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [id])

  return { addNote, isLoading, error }
}

// =============================================================================
// PATTERN HOOKS
// =============================================================================

/**
 * Hook for fetching failure patterns
 */
export function useFailurePatterns(category?: string) {
  const [data, setData] = useState<FailurePattern[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPatterns = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)

      const url = `/api/installs/dashboard/patterns${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch patterns')
      }
      const result = await response.json()
      setData(result.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchPatterns()
  }, [fetchPatterns])

  return { data, isLoading, error, refetch: fetchPatterns }
}

/**
 * Hook for documenting a known fix for a failure pattern
 */
export function useDocumentFix(id: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const documentFix = useCallback(async (payload: {
    knownFix: string
    autoFixable?: boolean
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/installs/dashboard/patterns/${id}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to document fix')
      }
      const result = await response.json()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [id])

  return { documentFix, isLoading, error }
}
