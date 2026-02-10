'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  toast,
} from '@0ne/ui'
import { Download, Link2, Calendar, HardDrive, Maximize2, X } from 'lucide-react'
import type { GHLMediaFile } from '../types'

interface FilePreviewDialogProps {
  file: GHLMediaFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Format date as relative time (e.g., "a month ago")
 */
function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
}: FilePreviewDialogProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  if (!file) return null

  const isImage = file.mimeType?.startsWith('image/')
  const isVideo = file.mimeType?.startsWith('video/')

  const handleCopyLink = async () => {
    if (file.url) {
      try {
        await navigator.clipboard.writeText(file.url)
        toast.success('Link copied to clipboard')
      } catch {
        toast.error('Failed to copy link')
      }
    }
  }

  const handleDownload = () => {
    if (file.url) {
      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setImageLoaded(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium truncate pr-4">
              {file.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex flex-col md:flex-row">
          {/* Preview */}
          <div className="flex-1 bg-muted/30 flex items-center justify-center p-6 min-h-[300px] md:min-h-[400px]">
            {isImage && file.url ? (
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-[400px] object-contain rounded-md shadow-sm"
                onLoad={handleImageLoad}
              />
            ) : isVideo && file.url ? (
              <video
                src={file.url}
                controls
                className="max-w-full max-h-[400px] rounded-md shadow-sm"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Preview not available</p>
                <p className="text-xs mt-1">{file.mimeType || 'Unknown type'}</p>
              </div>
            )}
          </div>

          {/* Details sidebar */}
          <div className="w-full md:w-64 p-6 border-t md:border-t-0 md:border-l bg-background">
            <div className="space-y-4">
              {/* Published date */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="text-sm font-medium">{formatRelativeDate(file.createdAt)}</p>
                </div>
              </div>

              {/* File size */}
              <div className="flex items-start gap-3">
                <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="text-sm font-medium">{formatFileSize(file.size)}</p>
                </div>
              </div>

              {/* Dimensions (for images) */}
              {isImage && imageDimensions && (
                <div className="flex items-start gap-3">
                  <Maximize2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dimensions</p>
                    <p className="text-sm font-medium">
                      {imageDimensions.width} × {imageDimensions.height} PX
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!file.url}
                  className="flex-1"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  disabled={!file.url}
                  className="flex-1"
                >
                  <Link2 className="h-4 w-4 mr-1" />
                  Copy link
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
