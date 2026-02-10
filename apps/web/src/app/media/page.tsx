'use client'

import { useState, useCallback } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Button, toast } from '@0ne/ui'
import Link from 'next/link'
import {
  useMediaLibrary,
  useFolderNavigation,
  createFolder,
  deleteMedia,
  MediaGrid,
  FolderBreadcrumbs,
  MediaToolbar,
  CreateFolderDialog,
  DeleteConfirmDialog,
  FilePreviewDialog,
} from '@/features/media'
import type { GHLMediaFile } from '@/features/media/types'

export default function MediaLibraryPage() {
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialog state
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // File preview state
  const [previewFile, setPreviewFile] = useState<GHLMediaFile | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Folder navigation
  const {
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    navigateToRoot,
    navigateToBreadcrumb,
  } = useFolderNavigation()

  // Media library data
  const { files, isLoading, error, refresh } = useMediaLibrary(currentFolderId)

  // Handle file click (open preview)
  const handleFileClick = useCallback((file: GHLMediaFile) => {
    setPreviewFile(file)
    setPreviewOpen(true)
  }, [])

  // Handle file/folder selection toggle
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Handle folder navigation (clears selection)
  const handleFolderClick = useCallback(
    (id: string, name: string) => {
      setSelectedIds(new Set())
      navigateToFolder(id, name)
    },
    [navigateToFolder]
  )

  // Handle breadcrumb navigation (clears selection)
  const handleBreadcrumbNavigate = useCallback(
    (index: number) => {
      setSelectedIds(new Set())
      navigateToBreadcrumb(index)
    },
    [navigateToBreadcrumb]
  )

  // Handle root navigation (clears selection)
  const handleNavigateRoot = useCallback(() => {
    setSelectedIds(new Set())
    navigateToRoot()
  }, [navigateToRoot])

  // Handle folder creation
  const handleCreateFolder = useCallback(
    async (name: string) => {
      setIsCreatingFolder(true)
      try {
        const result = await createFolder(name, currentFolderId)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`Folder "${name}" created`)
          setCreateFolderOpen(false)
          refresh()
        }
      } finally {
        setIsCreatingFolder(false)
      }
    },
    [currentFolderId, refresh]
  )

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (selectedIds.size === 0) return

    setIsDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      let successCount = 0
      let errorCount = 0

      for (const id of ids) {
        const result = await deleteMedia(id)
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} item${successCount > 1 ? 's' : ''}`)
      }
      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} item${errorCount > 1 ? 's' : ''}`)
      }

      setSelectedIds(new Set())
      setDeleteDialogOpen(false)
      refresh()
    } finally {
      setIsDeleting(false)
    }
  }, [selectedIds, refresh])

  // Handle refresh (clears selection)
  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set())
    refresh()
  }, [refresh])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            GHL Media Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage files in your GoHighLevel Media Library
          </p>
        </div>
        <Button asChild>
          <Link href="/media/upload">
            <Upload className="h-4 w-4" />
            Upload Files
          </Link>
        </Button>
      </div>

      {/* Breadcrumbs */}
      <FolderBreadcrumbs
        breadcrumbs={breadcrumbs}
        onNavigate={handleBreadcrumbNavigate}
        onNavigateRoot={handleNavigateRoot}
      />

      {/* Toolbar */}
      <MediaToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
        selectedCount={selectedIds.size}
        isLoading={isLoading}
      />

      {/* Content */}
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">
            Failed to load media library
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || 'An unexpected error occurred'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading files...</p>
        </div>
      ) : (
        <MediaGrid
          files={files}
          onFolderClick={handleFolderClick}
          onFileClick={handleFileClick}
          onSelect={handleSelect}
          selectedIds={selectedIds}
          viewMode={viewMode}
        />
      )}

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onConfirm={handleCreateFolder}
        isLoading={isCreatingFolder}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemCount={selectedIds.size}
        isLoading={isDeleting}
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}
