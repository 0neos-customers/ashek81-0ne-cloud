'use client'

import { Button } from '@0ne/ui'
import {
  LayoutGrid,
  List,
  RefreshCw,
  FolderPlus,
  Trash2,
  Loader2,
} from 'lucide-react'

interface MediaToolbarProps {
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onRefresh: () => void
  onCreateFolder: () => void
  onDelete: () => void
  selectedCount: number
  isLoading: boolean
}

export function MediaToolbar({
  viewMode,
  onViewModeChange,
  onRefresh,
  onCreateFolder,
  onDelete,
  selectedCount,
  isLoading,
}: MediaToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Left side: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        <Button variant="outline" size="sm" onClick={onCreateFolder}>
          <FolderPlus className="h-4 w-4" />
          <span className="hidden sm:inline">New Folder</span>
        </Button>

        {selectedCount > 0 && (
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              Delete ({selectedCount})
            </span>
            <span className="sm:hidden">{selectedCount}</span>
          </Button>
        )}
      </div>

      {/* Right side: View mode toggle */}
      <div className="flex items-center border rounded-md p-0.5 bg-muted/30">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'grid'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'list'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="List view"
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
