'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button, cn } from '@0ne/ui'

interface MultiSelectItem {
  id: string
  name: string
}

interface MultiSelectFilterProps {
  label: string
  items: MultiSelectItem[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  widthClassName?: string
  disabled?: boolean
}

export function MultiSelectFilter({
  label,
  items,
  selected,
  onSelectionChange,
  widthClassName = 'min-w-[140px]',
  disabled = false,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleItem = (id: string) => {
    // If empty (all visually selected), clicking one should deselect it (select all others)
    if (selected.length === 0) {
      onSelectionChange(items.filter((item) => item.id !== id).map((item) => item.id))
    }
    // If all are explicitly selected, clicking one should deselect it
    else if (selected.length === items.length) {
      onSelectionChange(items.filter((item) => item.id !== id).map((item) => item.id))
    } else if (selected.includes(id)) {
      onSelectionChange(selected.filter((s) => s !== id))
    } else {
      onSelectionChange([...selected, id])
    }
  }

  const selectAll = () => {
    onSelectionChange(items.map((item) => item.id))
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  // "Effectively all selected" means either:
  // - All items are explicitly selected (selected.length === items.length)
  // - No items are selected yet (selected.length === 0) which we treat as "all" for display
  const effectivelyAllSelected = items.length > 0 && (selected.length === items.length || selected.length === 0)

  // Display text
  const displayText = effectivelyAllSelected
    ? `All ${label.toLowerCase()}`
    : selected.length === 1
    ? items.find((item) => item.id === selected[0])?.name || label
    : `${selected.length} ${label.toLowerCase()}`

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('h-9 px-3 justify-between', widthClassName)}
        disabled={disabled}
      >
        <span className="text-sm">{displayText}</span>
        <ChevronDown className={cn(
          'ml-2 h-4 w-4 opacity-50 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-[100] mt-1.5 w-64 rounded-md border border-border bg-white p-2 shadow-md dark:bg-zinc-900">
          <div className="mb-2 px-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Filter by {label.toLowerCase()}
            </span>
            {items.length > 0 && (
              <button
                onClick={effectivelyAllSelected ? clearAll : selectAll}
                className="text-xs text-primary hover:underline"
              >
                {effectivelyAllSelected ? 'Clear' : 'Select all'}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No {label.toLowerCase()} available
            </div>
          ) : (
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {items.map((item) => {
                // When selected is empty, treat all as selected (visually)
                const isSelected = selected.length === 0 || selected.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                      'hover:bg-accent',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input'
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
