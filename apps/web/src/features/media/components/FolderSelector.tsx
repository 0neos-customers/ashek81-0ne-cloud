'use client'

import { Button } from '@0ne/ui'
import { Folder, ChevronRight } from 'lucide-react'

interface FolderSelectorProps {
  currentFolder: {
    id: string | null
    name: string
  }
  onSelectFolder: () => void
  disabled?: boolean
}

/**
 * Folder selector dropdown button
 *
 * Shows the current target folder and triggers a folder picker
 * when clicked.
 */
export function FolderSelector({
  currentFolder,
  onSelectFolder,
  disabled = false,
}: FolderSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Upload to:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectFolder}
        disabled={disabled}
        className="gap-2"
      >
        <Folder className="h-4 w-4" />
        <span className="max-w-[200px] truncate">
          {currentFolder.name}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
