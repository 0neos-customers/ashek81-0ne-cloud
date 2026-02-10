'use client'

import { cn } from '@0ne/ui'
import { Button } from '@0ne/ui'
import { X, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import type { UploadProgress } from '../types'

interface UploadProgressListProps {
  uploads: UploadProgress[]
  onCancel: (id: string) => void
  onRetry: (id: string) => void
}

/**
 * List of upload progress items
 *
 * Shows each upload with progress bar, status indicator,
 * and action buttons (cancel, retry).
 */
export function UploadProgressList({
  uploads,
  onCancel,
  onRetry,
}: UploadProgressListProps) {
  if (uploads.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Uploads ({uploads.length})
      </h3>
      <div className="space-y-2">
        {uploads.map((upload) => (
          <UploadProgressItem
            key={upload.id}
            upload={upload}
            onCancel={() => onCancel(upload.id)}
            onRetry={() => onRetry(upload.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface UploadProgressItemProps {
  upload: UploadProgress
  onCancel: () => void
  onRetry: () => void
}

function UploadProgressItem({ upload, onCancel, onRetry }: UploadProgressItemProps) {
  const { fileName, progress, status, error } = upload

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-card p-3',
        status === 'error' && 'border-destructive/50 bg-destructive/5'
      )}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {status === 'pending' && (
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
        )}
        {status === 'uploading' && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        {status === 'complete' && (
          <CheckCircle className="h-5 w-5 text-green-600" />
        )}
        {status === 'error' && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
      </div>

      {/* File Info & Progress */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>

        {(status === 'pending' || status === 'uploading') && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {progress}%
            </span>
          </div>
        )}

        {status === 'complete' && (
          <p className="text-xs text-muted-foreground">Upload complete</p>
        )}

        {status === 'error' && (
          <p className="text-xs text-destructive">{error || 'Upload failed'}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        {(status === 'pending' || status === 'uploading') && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCancel}
            title="Cancel upload"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {status === 'error' && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRetry}
            title="Retry upload"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
