'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface ExpenseCategoryData {
  id: string
  name: string
  slug: string
  color: string | null
  description: string | null
  is_system: boolean
  display_order: number
  created_at: string
  updated_at: string
  expense_count: number
}

export interface ExpenseCategoriesResponse {
  categories: ExpenseCategoryData[]
  total: number
}

export interface CreateCategoryInput {
  name: string
  color?: string
  description?: string
}

export interface UpdateCategoryInput {
  id: string
  name?: string
  color?: string
  description?: string
}

interface UseExpenseCategoriesReturn {
  categories: ExpenseCategoryData[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

interface MutationResult<T = unknown> {
  success: boolean
  category?: T
  error?: string
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for fetching expense categories
 */
export function useExpenseCategories(): UseExpenseCategoriesReturn {
  const [categories, setCategories] = useState<ExpenseCategoryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/kpi/expense-categories')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch categories')
      }
      const data: ExpenseCategoriesResponse = await response.json()
      setCategories(data.categories)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { categories, isLoading, error, refetch: fetchData }
}

/**
 * Create a new expense category
 */
export async function createCategory(
  input: CreateCategoryInput
): Promise<MutationResult<ExpenseCategoryData>> {
  try {
    const response = await fetch('/api/kpi/expense-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create category' }
    }

    return { success: true, category: data.category }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create category',
    }
  }
}

/**
 * Update an existing expense category
 */
export async function updateCategory(
  input: UpdateCategoryInput
): Promise<MutationResult<ExpenseCategoryData>> {
  try {
    const response = await fetch('/api/kpi/expense-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update category' }
    }

    return { success: true, category: data.category }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update category',
    }
  }
}

/**
 * Delete an expense category
 */
export async function deleteCategory(id: string): Promise<MutationResult> {
  try {
    const response = await fetch(`/api/kpi/expense-categories?id=${id}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete category' }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete category',
    }
  }
}
