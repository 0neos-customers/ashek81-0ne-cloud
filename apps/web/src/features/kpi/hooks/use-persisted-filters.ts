'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { startOfMonth } from 'date-fns'
import type { DateRange } from '@0ne/db/types/kpi'

const STORAGE_KEY = 'kpi-filters'

// All expense categories - reset should select all
const ALL_EXPENSE_CATEGORIES = ['advertising', 'software', 'content', 'team']

interface PersistedFilters {
  period: string
  dateRange: DateRange
  sources: string[]  // Attribution sources (e.g., 'facebook', 'instagram', 'direct')
  selectedExpenses: string[]
}

// Helper to get MTD date range (recalculated fresh each time)
function getMTDDateRange(): DateRange {
  const now = new Date()
  return {
    from: startOfMonth(now),
    to: now,
  }
}

// Default filters: MTD, all sources (empty = all), all expenses
function getDefaultFilters(): PersistedFilters {
  return {
    period: 'mtd',
    dateRange: getMTDDateRange(),
    sources: [], // empty = all sources selected
    selectedExpenses: ALL_EXPENSE_CATEGORIES, // all expenses selected
  }
}

export function usePersistedFilters() {
  const [filters, setFilters] = useState<PersistedFilters>(getDefaultFilters)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Convert date strings back to Date objects
        if (parsed.dateRange) {
          parsed.dateRange.from = new Date(parsed.dateRange.from)
          parsed.dateRange.to = new Date(parsed.dateRange.to)
        }
        setFilters({ ...getDefaultFilters(), ...parsed })
      }
    } catch {
      // If parsing fails, use defaults
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage when filters change
  const saveFilters = useCallback((newFilters: Partial<PersistedFilters>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // localStorage might be full or disabled
      }
      return updated
    })
  }, [])

  // Individual setters
  const setPeriod = useCallback((period: string) => {
    saveFilters({ period })
  }, [saveFilters])

  const setDateRange = useCallback((dateRange: DateRange) => {
    saveFilters({ dateRange })
  }, [saveFilters])

  const setSources = useCallback((sources: string[]) => {
    saveFilters({ sources })
  }, [saveFilters])

  const setSelectedExpenses = useCallback((selectedExpenses: string[]) => {
    saveFilters({ selectedExpenses })
  }, [saveFilters])

  const resetFilters = useCallback(() => {
    const defaults = getDefaultFilters()
    setFilters(defaults)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  // Check if any filters differ from defaults
  const hasActiveFilters = useMemo(() => {
    // Period is not MTD
    if (filters.period !== 'mtd') return true
    // Sources are filtered (empty = all, which is default)
    if (filters.sources.length > 0) return true
    // Not all expenses selected
    if (filters.selectedExpenses.length !== ALL_EXPENSE_CATEGORIES.length) return true
    // Check if all expense categories are selected
    const hasAllExpenses = ALL_EXPENSE_CATEGORIES.every(cat =>
      filters.selectedExpenses.includes(cat)
    )
    if (!hasAllExpenses) return true
    return false
  }, [filters.period, filters.sources.length, filters.selectedExpenses])

  return {
    ...filters,
    isLoaded,
    hasActiveFilters,
    setPeriod,
    setDateRange,
    setSources,
    setSelectedExpenses,
    resetFilters,
  }
}
