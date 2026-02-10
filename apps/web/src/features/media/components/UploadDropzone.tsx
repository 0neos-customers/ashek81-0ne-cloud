'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@0ne/ui'
import { Upload } from 'lucide-react'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  accept?: string
}

/**
 * Drag-and-drop file upload zone
 *
 * Accepts files via drag-and-drop or click-to-browse.
 * Shows visual feedback on drag over.
 */
export function UploadDropzone({
  onFilesSelected,
  disabled = false,
  accept,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      onFilesSelected(droppedFiles)
    }
  }, [disabled, onFilesSelected])

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles)
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [onFilesSelected])

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className={cn(
            'rounded-full bg-muted p-4 transition-colors',
            isDragOver && 'bg-primary/10'
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 text-muted-foreground transition-colors',
              isDragOver && 'text-primary'
            )}
          />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isDragOver ? 'Drop files here' : 'Drag files here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground">
            Upload images, videos, and documents
          </p>
        </div>
      </div>
    </div>
  )
}
