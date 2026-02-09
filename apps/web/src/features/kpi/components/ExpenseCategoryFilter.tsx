'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button, cn } from '@0ne/ui'

interface ExpenseCategory {
  id: string
  name: string
  amount: number
}

interface ExpenseCategoryFilterProps {
  categories: ExpenseCategory[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
}

export function ExpenseCategoryFilter({
  categories,
  selected,
  onSelectionChange,
}: ExpenseCategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const toggleCategory = (id: string) => {
    if (selected.includes(id)) {
      onSelectionChange(selected.filter((s) => s !== id))
    } else {
      onSelectionChange([...selected, id])
    }
  }

  const selectedTotal = categories
    .filter((c) => selected.includes(c.id))
    .reduce((sum, c) => sum + c.amount, 0)

  const selectedCount = selected.length

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 justify-between min-w-[160px]"
      >
        <span className="text-sm">
          Expenses {selectedCount > 0 && `(${selectedCount})`}
        </span>
        <ChevronDown className={cn(
          'ml-2 h-4 w-4 opacity-50 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-[100] mt-1.5 w-64 rounded-md border border-border bg-white p-2 shadow-md dark:bg-zinc-900">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            Select expense categories for cost calculations
          </div>

          <div className="space-y-0.5">
            {categories.map((category) => {
              const isSelected = selected.includes(category.id)
              return (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors',
                    'hover:bg-accent',
                    isSelected && 'bg-accent/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input'
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{category.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ${category.amount.toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-2 border-t border-border pt-2 px-2 flex justify-between text-sm">
            <span className="font-medium">Total Selected</span>
            <span className="font-bold">${selectedTotal.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
