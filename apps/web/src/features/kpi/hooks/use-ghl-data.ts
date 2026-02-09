'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Transaction } from '../components/TransactionsTable'

// =============================================================================
// TYPES
// =============================================================================

export interface GhlMetric {
  current: number
  previous?: number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  description?: string
}

export interface StageDistributionItem {
  stage: string
  count: number
  label: string
  color: string
}

export interface RevenueTrendPoint {
  date: string
  setupFees: number
  fundingFees: number
  total: number
}

export interface GhlData {
  // Revenue metrics
  totalRevenue: GhlMetric
  setupFees: GhlMetric
  fundingFees: GhlMetric
  avgTransaction: GhlMetric
  transactionCount: GhlMetric
  // Contact metrics
  totalContacts: GhlMetric
  newContacts: GhlMetric
  handRaisers: GhlMetric
  clients: GhlMetric
  // Funnel distribution
  stageDistribution: StageDistributionItem[]
  // Revenue trend
  revenueTrend: RevenueTrendPoint[]
  // Period info
  period: {
    startDate: string
    endDate: string
    label: string
  }
}

interface DateRange {
  from: Date
  to: Date
}

interface UseGhlDataOptions {
  /** Date range for filtering (takes precedence over period) */
  dateRange?: DateRange
  /** Legacy: period preset string (used if dateRange not provided) */
  period?: string
  useSampleData?: boolean
}

interface UseGhlDataReturn {
  data: GhlData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for fetching GHL KPI data
 * Returns revenue metrics, transaction counts, and averages from GHL transactions
 */
export function useGhlData(options: UseGhlDataOptions = {}): UseGhlDataReturn {
  const { dateRange, period = '30d', useSampleData = false } = options
  const [data, setData] = useState<GhlData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Memoize date strings to avoid unnecessary re-renders
  const startDate = dateRange ? formatDate(dateRange.from) : undefined
  const endDate = dateRange ? formatDate(dateRange.to) : undefined

  const fetchData = useCallback(async () => {
    if (useSampleData) {
      setData(SAMPLE_GHL_DATA)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (startDate && endDate) {
        params.set('startDate', startDate)
        params.set('endDate', endDate)
      } else {
        params.set('period', period)
      }

      const response = await fetch(`/api/kpi/ghl?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch GHL data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, period, useSampleData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

// =============================================================================
// SAMPLE DATA (for development)
// =============================================================================

const SAMPLE_GHL_DATA: GhlData = {
  totalRevenue: {
    current: 143973,
    previous: 125000,
    change: 15.2,
    trend: 'up',
  },
  setupFees: {
    current: 45000,
    previous: 38000,
    change: 18.4,
    trend: 'up',
    description: 'PREIFM transactions (initial client onboarding)',
  },
  fundingFees: {
    current: 98973,
    previous: 87000,
    change: 13.8,
    trend: 'up',
    description: 'New Invoice transactions (7% success fees)',
  },
  avgTransaction: {
    current: 761.76,
    previous: 725.50,
    change: 5.0,
    trend: 'up',
  },
  transactionCount: {
    current: 189,
    previous: 172,
    change: 9.9,
    trend: 'up',
  },
  // Contact metrics
  totalContacts: {
    current: 2871,
    description: 'All contacts with funnel tags',
  },
  newContacts: {
    current: 145,
    previous: 120,
    change: 20.8,
    trend: 'up',
    description: 'Contacts created in selected period',
  },
  handRaisers: {
    current: 89,
    description: 'Contacts in hand_raiser stage',
  },
  clients: {
    current: 12,
    description: 'Premium + VIP clients',
  },
  // Funnel distribution
  stageDistribution: [
    { stage: 'member', count: 2500, label: 'Member', color: '#94a3b8' },
    { stage: 'hand_raiser', count: 89, label: 'Hand Raiser', color: '#60a5fa' },
    { stage: 'qualified_premium', count: 25, label: 'Qualified (Premium)', color: '#f472b6' },
    { stage: 'qualified_vip', count: 30, label: 'Qualified (VIP)', color: '#a78bfa' },
    { stage: 'offer_made_premium', count: 6, label: 'Offer Made (Premium)', color: '#ec4899' },
    { stage: 'offer_made_vip', count: 1, label: 'Offer Made (VIP)', color: '#8b5cf6' },
    { stage: 'offer_seen', count: 5, label: 'Offer Seen', color: '#fb923c' },
    { stage: 'premium', count: 3, label: 'Premium', color: '#22c55e' },
    { stage: 'vip', count: 9, label: 'VIP', color: '#FF692D' },
  ],
  // Sample revenue trend (monthly)
  revenueTrend: [
    { date: '2025-06', setupFees: 8500, fundingFees: 12400, total: 20900 },
    { date: '2025-07', setupFees: 10200, fundingFees: 19595, total: 29795 },
    { date: '2025-08', setupFees: 6800, fundingFees: 11449, total: 18249 },
    { date: '2025-09', setupFees: 5200, fundingFees: 10480, total: 15680 },
    { date: '2025-10', setupFees: 3800, fundingFees: 7420, total: 11220 },
    { date: '2025-11', setupFees: 4500, fundingFees: 7876, total: 12376 },
    { date: '2025-12', setupFees: 2200, fundingFees: 5636, total: 7836 },
    { date: '2026-01', setupFees: 3800, fundingFees: 4117, total: 7917 },
  ],
  period: {
    startDate: '2025-01-01',
    endDate: '2026-02-08',
    label: 'lifetime',
  },
}

// =============================================================================
// TRANSACTIONS HOOK TYPES
// =============================================================================

export type TransactionType = 'all' | 'setup' | 'funding'

interface TransactionsResponse {
  data: Transaction[]
  total: number
  limit: number
  offset: number
}

interface UseGhlTransactionsOptions {
  /** Date range for filtering */
  dateRange?: DateRange
  /** Legacy: period preset string (used if dateRange not provided) */
  period?: string
  /** Transaction type filter */
  transactionType?: TransactionType
  /** Search term for contact name */
  search?: string
  /** Number of records per page */
  limit?: number
  /** Starting offset for pagination */
  offset?: number
}

interface UseGhlTransactionsReturn {
  transactions: Transaction[]
  total: number
  limit: number
  offset: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// =============================================================================
// TRANSACTIONS HOOK
// =============================================================================

/**
 * Hook for fetching GHL transactions with pagination, filtering, and search
 */
export function useGhlTransactions(options: UseGhlTransactionsOptions = {}): UseGhlTransactionsReturn {
  const {
    dateRange,
    period = '30d',
    transactionType = 'all',
    search = '',
    limit = 20,
    offset = 0,
  } = options

  const [data, setData] = useState<TransactionsResponse>({
    data: [],
    total: 0,
    limit,
    offset,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Memoize date strings to avoid unnecessary re-renders
  const startDate = dateRange ? formatDate(dateRange.from) : undefined
  const endDate = dateRange ? formatDate(dateRange.to) : undefined

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      // Date range
      if (startDate && endDate) {
        params.set('startDate', startDate)
        params.set('endDate', endDate)
      } else {
        params.set('period', period)
      }

      // Include transactions
      params.set('include', 'transactions')

      // Filters
      if (transactionType !== 'all') {
        params.set('transactionType', transactionType)
      }
      if (search) {
        params.set('search', search)
      }

      // Pagination
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const response = await fetch(`/api/kpi/ghl?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch transactions')
      }

      const result = await response.json()

      if (result.transactions) {
        setData(result.transactions)
      } else {
        setData({ data: [], total: 0, limit, offset })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setData({ data: [], total: 0, limit, offset })
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, period, transactionType, search, limit, offset])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    transactions: data.data,
    total: data.total,
    limit: data.limit,
    offset: data.offset,
    isLoading,
    error,
    refetch: fetchData,
  }
}
