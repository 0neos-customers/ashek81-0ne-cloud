'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@0ne/ui'
import { Button } from '@0ne/ui'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import {
  useMediaUpload,
  useFolderNavigation,
  UploadDropzone,
  UploadProgressList,
  FolderSelector,
} from '@/features/media'

export default function UploadMediaPage() {
  const { uploads, isUploading, uploadFiles, cancelUpload, resetUploads } = useMediaUpload()
  const { currentFolderId, breadcrumbs, navigateToRoot } = useFolderNavigation()
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  // Current folder info for display
  const currentFolderInfo = useMemo(() => {
    if (breadcrumbs.length === 0) {
      return { id: null, name: 'Root' }
    }
    const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1]
    return { id: lastBreadcrumb.id, name: lastBreadcrumb.name }
  }, [breadcrumbs])

  // Handle file selection from dropzone
  const handleFilesSelected = useCallback((files: File[]) => {
    uploadFiles(files, currentFolderId)
  }, [uploadFiles, currentFolderId])

  // Handle retry - for now just show a message since we don't have the original file
  const handleRetry = useCallback((id: string) => {
    // Note: To implement retry, we would need to store the original File objects
    // For now, this is a placeholder that could be expanded
    console.log('Retry requested for:', id)
  }, [])

  // Handle folder picker
  const handleSelectFolder = useCallback(() => {
    // For now, reset to root. In a full implementation, this would open a folder picker dialog
    setShowFolderPicker(true)
    // Temporary: just reset to root
    navigateToRoot()
    setShowFolderPicker(false)
  }, [navigateToRoot])

  // Calculate upload summary
  const uploadSummary = useMemo(() => {
    const completed = uploads.filter((u) => u.status === 'complete').length
    const failed = uploads.filter((u) => u.status === 'error').length
    const pending = uploads.filter((u) => u.status === 'pending' || u.status === 'uploading').length
    return { completed, failed, pending, total: uploads.length }
  }, [uploads])

  // Show success state when all uploads are complete with no errors
  const showSuccess = uploadSummary.total > 0 &&
    uploadSummary.pending === 0 &&
    uploadSummary.failed === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/media">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload Media</h1>
          <p className="text-sm text-muted-foreground">
            Upload files to your GHL Media Library
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Folder Selector */}
          <FolderSelector
            currentFolder={currentFolderInfo}
            onSelectFolder={handleSelectFolder}
            disabled={isUploading}
          />

          {/* Dropzone */}
          <Card>
            <CardContent className="p-6">
              <UploadDropzone
                onFilesSelected={handleFilesSelected}
                disabled={isUploading}
              />
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <UploadProgressList
                  uploads={uploads}
                  onCancel={cancelUpload}
                  onRetry={handleRetry}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upload Summary */}
          {uploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total files</span>
                  <span className="font-medium">{uploadSummary.total}</span>
                </div>
                {uploadSummary.completed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Completed</span>
                    <span className="font-medium text-green-600">{uploadSummary.completed}</span>
                  </div>
                )}
                {uploadSummary.pending > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">In progress</span>
                    <span className="font-medium">{uploadSummary.pending}</span>
                  </div>
                )}
                {uploadSummary.failed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-destructive">Failed</span>
                    <span className="font-medium text-destructive">{uploadSummary.failed}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t">
                  {showSuccess ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">All uploads complete!</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetUploads}
                          className="flex-1"
                        >
                          Upload More
                        </Button>
                        <Link href="/media" className="flex-1">
                          <Button size="sm" className="w-full">
                            View Library
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetUploads}
                      disabled={isUploading}
                      className="w-full"
                    >
                      Clear List
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Drag multiple files at once to upload in bulk</li>
                <li>Supported formats: images, videos, PDFs, and documents</li>
                <li>Large files may take longer to upload</li>
                <li>Files will appear in your GHL Media Library</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
