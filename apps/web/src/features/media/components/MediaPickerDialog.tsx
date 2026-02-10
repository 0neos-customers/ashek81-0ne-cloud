'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@0ne/ui'
import { Loader2 } from 'lucide-react'
import { MediaGrid } from './MediaGrid'
import { FolderBreadcrumbs } from './FolderBreadcrumbs'
import { useMediaLibrary } from '../hooks/use-media-library'
import { useFolderNavigation } from '../hooks/use-folder-navigation'
import type { GHLMediaFile } from '../types'

type MediaType = 'image' | 'video' | 'file'

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (files: GHLMediaFile[]) => void
  mode?: 'single' | 'multiple'
  allowedTypes?: MediaType[]
}

/**
 * Determine media type from MIME type
 */
function getMediaType(file: GHLMediaFile): MediaType | 'folder' {
  if (file.type === 'folder') return 'folder'
  const mimeType = file.mimeType || ''
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}

/**
 * Reusable media picker dialog for selecting files from GHL Media Library
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  mode = 'single',
  allowedTypes,
}: MediaPickerDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedFiles, setSelectedFiles] = useState<Map<string, GHLMediaFile>>(new Map())

  const {
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    navigateToRoot,
    navigateToBreadcrumb,
  } = useFolderNavigation()

  const { files, isLoading } = useMediaLibrary(currentFolderId)

  // Filter files by allowed types (always show folders for navigation)
  const filteredFiles = useMemo(() => {
    if (!allowedTypes || allowedTypes.length === 0) return files

    return files.filter((file) => {
      if (file.type === 'folder') return true
      const fileType = getMediaType(file)
      return allowedTypes.includes(fileType as MediaType)
    })
  }, [files, allowedTypes])

  // Reset selection when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedIds(new Set())
        setSelectedFiles(new Map())
        navigateToRoot()
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, navigateToRoot]
  )

  // Handle file selection
  const handleSelect = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id)
      if (!file || file.type === 'folder') return

      if (mode === 'single') {
        // Single mode: auto-select and close
        onSelect([file])
        handleOpenChange(false)
      } else {
        // Multiple mode: toggle selection
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id)
            setSelectedFiles((prevFiles) => {
              const nextFiles = new Map(prevFiles)
              nextFiles.delete(id)
              return nextFiles
            })
          } else {
            next.add(id)
            setSelectedFiles((prevFiles) => {
              const nextFiles = new Map(prevFiles)
              nextFiles.set(id, file)
              return nextFiles
            })
          }
          return next
        })
      }
    },
    [files, mode, onSelect, handleOpenChange]
  )

  // Handle folder navigation
  const handleFolderClick = useCallback(
    (id: string, name: string) => {
      navigateToFolder(id, name)
    },
    [navigateToFolder]
  )

  // Handle confirm selection (multiple mode)
  const handleConfirm = useCallback(() => {
    const selected = Array.from(selectedFiles.values())
    onSelect(selected)
    handleOpenChange(false)
  }, [selectedFiles, onSelect, handleOpenChange])

  // Get type filter description
  const typeDescription = useMemo(() => {
    if (!allowedTypes || allowedTypes.length === 0) return 'all files'
    if (allowedTypes.length === 1) {
      return `${allowedTypes[0]}s`
    }
    const last = allowedTypes[allowedTypes.length - 1]
    const rest = allowedTypes.slice(0, -1)
    return `${rest.join(', ')} and ${last}s`
  }, [allowedTypes])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
          <DialogDescription>
            {mode === 'single'
              ? `Click to select ${typeDescription.replace(/s$/, '')} from your GHL Media Library`
              : `Select ${typeDescription} from your GHL Media Library`}
          </DialogDescription>
        </DialogHeader>

        {/* Folder Navigation */}
        <div className="border-b pb-2">
          <FolderBreadcrumbs
            breadcrumbs={breadcrumbs}
            onNavigate={navigateToBreadcrumb}
            onNavigateRoot={navigateToRoot}
          />
        </div>

        {/* Media Grid */}
        <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MediaGrid
              files={filteredFiles}
              onFolderClick={handleFolderClick}
              onFileClick={() => {}} // No-op - selection handled by onSelect
              onSelect={handleSelect}
              selectedIds={selectedIds}
              viewMode="grid"
            />
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {mode === 'multiple' && (
            <p className="text-sm text-muted-foreground mr-auto">
              {selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {mode === 'multiple' && (
            <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
              Select ({selectedIds.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
