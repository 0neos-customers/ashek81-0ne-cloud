'use client'

import { useState, useCallback } from 'react'
import type { BreadcrumbItem } from '../types'

export interface UseFolderNavigationReturn {
  currentFolderId: string | null
  breadcrumbs: BreadcrumbItem[]
  navigateToFolder: (id: string, name: string) => void
  navigateBack: () => void
  navigateToRoot: () => void
  navigateToBreadcrumb: (index: number) => void
}

/**
 * Hook for managing folder navigation state with breadcrumb support
 */
export function useFolderNavigation(): UseFolderNavigationReturn {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])

  // Current folder is the last breadcrumb, or null for root
  const currentFolderId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : null

  const navigateToFolder = useCallback((id: string, name: string) => {
    setBreadcrumbs((prev) => [...prev, { id, name }])
  }, [])

  const navigateBack = useCallback(() => {
    setBreadcrumbs((prev) => {
      if (prev.length === 0) return prev
      return prev.slice(0, -1)
    })
  }, [])

  const navigateToRoot = useCallback(() => {
    setBreadcrumbs([])
  }, [])

  const navigateToBreadcrumb = useCallback((index: number) => {
    setBreadcrumbs((prev) => {
      if (index < 0 || index >= prev.length) return prev
      // Keep breadcrumbs up to and including the clicked index
      return prev.slice(0, index + 1)
    })
  }, [])

  return {
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    navigateToBreadcrumb,
  }
}
