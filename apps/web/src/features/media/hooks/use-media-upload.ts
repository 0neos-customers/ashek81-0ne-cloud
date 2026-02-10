'use client'

import { useState, useCallback, useRef } from 'react'
import type { UploadProgress } from '../types'

export interface UseMediaUploadReturn {
  uploads: UploadProgress[]
  isUploading: boolean
  uploadFiles: (files: File[], parentId?: string | null) => Promise<void>
  cancelUpload: (id: string) => void
  resetUploads: () => void
}

/**
 * Hook for uploading files to GHL media library with progress tracking
 */
export function useMediaUpload(): UseMediaUploadReturn {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map())

  const isUploading = uploads.some((u) => u.status === 'pending' || u.status === 'uploading')

  const updateUpload = useCallback((id: string, updates: Partial<UploadProgress>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)))
  }, [])

  const uploadFile = useCallback(
    async (file: File, id: string, parentId?: string | null): Promise<void> => {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
        xhrMapRef.current.set(id, xhr)

        const formData = new FormData()
        formData.append('file', file)
        if (parentId) {
          formData.append('parentId', parentId)
        }

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            updateUpload(id, { progress, status: 'uploading' })
          }
        })

        xhr.addEventListener('load', () => {
          xhrMapRef.current.delete(id)
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              updateUpload(id, {
                progress: 100,
                status: 'complete',
                url: response.url || response.file?.url,
              })
            } catch {
              updateUpload(id, { progress: 100, status: 'complete' })
            }
          } else {
            let errorMessage = 'Upload failed'
            try {
              const response = JSON.parse(xhr.responseText)
              errorMessage = response.error || errorMessage
            } catch {
              // Use default error message
            }
            updateUpload(id, { status: 'error', error: errorMessage })
          }
          resolve()
        })

        xhr.addEventListener('error', () => {
          xhrMapRef.current.delete(id)
          updateUpload(id, { status: 'error', error: 'Network error' })
          resolve()
        })

        xhr.addEventListener('abort', () => {
          xhrMapRef.current.delete(id)
          updateUpload(id, { status: 'error', error: 'Upload cancelled' })
          resolve()
        })

        xhr.open('POST', '/api/media/upload')
        xhr.send(formData)
      })
    },
    [updateUpload]
  )

  const uploadFiles = useCallback(
    async (files: File[], parentId?: string | null): Promise<void> => {
      // Create initial upload entries
      const newUploads: UploadProgress[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        fileName: file.name,
        progress: 0,
        status: 'pending',
      }))

      setUploads((prev) => [...prev, ...newUploads])

      // Upload all files in parallel
      await Promise.all(
        newUploads.map((upload, index) => uploadFile(files[index], upload.id, parentId))
      )
    },
    [uploadFile]
  )

  const cancelUpload = useCallback((id: string) => {
    const xhr = xhrMapRef.current.get(id)
    if (xhr) {
      xhr.abort()
    }
  }, [])

  const resetUploads = useCallback(() => {
    // Cancel any in-progress uploads
    xhrMapRef.current.forEach((xhr) => xhr.abort())
    xhrMapRef.current.clear()
    setUploads([])
  }, [])

  return {
    uploads,
    isUploading,
    uploadFiles,
    cancelUpload,
    resetUploads,
  }
}
