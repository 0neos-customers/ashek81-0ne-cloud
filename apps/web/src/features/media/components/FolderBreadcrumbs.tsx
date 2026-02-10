'use client'

import { ChevronRight, Home } from 'lucide-react'
import type { BreadcrumbItem } from '../types'

interface FolderBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[]
  onNavigate: (index: number) => void
  onNavigateRoot: () => void
}

export function FolderBreadcrumbs({
  breadcrumbs,
  onNavigate,
  onNavigateRoot,
}: FolderBreadcrumbsProps) {
  return (
    <nav className="flex items-center text-sm" aria-label="Folder navigation">
      {/* Home/Root */}
      <button
        onClick={onNavigateRoot}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
          breadcrumbs.length === 0
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <Home className="h-4 w-4" />
        <span>Media Library</span>
      </button>

      {/* Breadcrumb items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <div key={item.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mx-1" />
            <button
              onClick={() => !isLast && onNavigate(index)}
              disabled={isLast}
              className={`px-2 py-1 rounded-md transition-colors max-w-[200px] truncate ${
                isLast
                  ? 'text-foreground font-medium cursor-default'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={item.name}
            >
              {item.name}
            </button>
          </div>
        )
      })}
    </nav>
  )
}
