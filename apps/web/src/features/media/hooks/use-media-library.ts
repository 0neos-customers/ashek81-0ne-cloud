'use client'

import useSWR from 'swr'
import type { GHLMediaFile, MediaListResponse } from '../types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface UseMediaLibraryReturn {
  files: GHLMediaFile[]
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
}

/**
 * Hook for fetching GHL media library files
 *
 * @param parentId - Optional folder ID to list contents of (null for root)
 */
export function useMediaLibrary(parentId?: string | null): UseMediaLibraryReturn {
  const params = new URLSearchParams()
  if (parentId) {
    params.set('parentId', parentId)
  }

  const url = `/api/media${params.toString() ? '?' + params.toString() : ''}`

  const { data, error, mutate } = useSWR<MediaListResponse>(url, fetcher)

  return {
    files: data?.files || [],
    isLoading: !error && !data,
    error,
    refresh: mutate,
  }
}

/**
 * Create a new folder in the media library
 */
export async function createFolder(
  name: string,
  parentId?: string | null
): Promise<{ folder?: GHLMediaFile; error?: string }> {
  try {
    const response = await fetch('/api/media/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create folder' }
    }
    return { folder: data.folder }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Delete a file or folder from the media library
 */
export async function deleteMedia(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/media?id=${id}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete' }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
