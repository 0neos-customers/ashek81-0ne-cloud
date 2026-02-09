'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { Button, cn } from '@0ne/ui'
import { useSources, type SourceOption } from '../hooks/use-sources'

interface SourceFilterProps {
  selected: string[]
  onSelectionChange: (selected: string[]) => void
}

export function SourceFilter({
  selected,
  onSelectionChange,
}: SourceFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { sources, isLoading } = useSources()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleSource = (source: string) => {
    // If empty (all selected), clicking one should deselect it (select all others)
    if (selected.length === 0) {
      onSelectionChange(sources.filter((o) => o.value !== source).map((o) => o.value))
    } else if (selected.includes(source)) {
      onSelectionChange(selected.filter((s) => s !== source))
    } else {
      onSelectionChange([...selected, source])
    }
  }

  const selectAll = () => {
    onSelectionChange(sources.map((o) => o.value))
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  // Empty array means "all sources" (no filter applied)
  // So visually we treat empty as "all selected"
  const effectivelyAllSelected = selected.length === 0 || selected.length === sources.length

  // Display text
  const displayText = isLoading
    ? 'Loading...'
    : effectivelyAllSelected
    ? 'All sources'
    : selected.length === 1
    ? sources.find((o) => o.value === selected[0])?.label ?? selected[0]
    : `${selected.length} sources`

  // Format count for display (e.g., 1000 -> "1k", 1500 -> "1.5k")
  const formatCount = (count: number): string => {
    if (count >= 1000) {
      const k = count / 1000
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`
    }
    return count.toString()
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 justify-between min-w-[140px]"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span className="text-sm">{displayText}</span>
        )}
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 opacity-50 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      {isOpen && !isLoading && (
        <div className="absolute top-full left-0 z-[100] mt-1.5 w-56 rounded-md border border-border bg-white p-2 shadow-md dark:bg-zinc-900">
          <div className="mb-2 px-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Filter by source
            </span>
            <button
              onClick={effectivelyAllSelected ? clearAll : selectAll}
              className="text-xs text-primary hover:underline"
            >
              {effectivelyAllSelected ? 'Clear' : 'Select all'}
            </button>
          </div>

          <div className="space-y-0.5 max-h-80 overflow-y-auto">
            {sources.map((option: SourceOption) => {
              // When selected is empty, treat all as selected (visually)
              const isSelected = selected.length === 0 || selected.includes(option.value)
              return (
                <button
                  key={option.value}
                  onClick={() => toggleSource(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                    'hover:bg-accent',
                    isSelected && 'bg-accent/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="flex-1 text-left">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCount(option.count)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
