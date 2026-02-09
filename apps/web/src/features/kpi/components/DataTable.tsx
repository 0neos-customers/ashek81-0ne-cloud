'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  cn,
} from '@0ne/ui'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  header: string
  /** Custom render function for the cell */
  render?: (value: unknown, row: T) => React.ReactNode
  /** Whether this column is sortable (default: true) */
  sortable?: boolean
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Column width class (e.g., 'w-32') */
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  /** Unique key field for each row */
  keyField: keyof T
  /** Rows per page (default: 10) */
  pageSize?: number
  /** Show pagination controls */
  paginated?: boolean
  /** Callback when row is clicked */
  onRowClick?: (row: T) => void
  /** Empty state message */
  emptyMessage?: string
  /** Loading state */
  loading?: boolean
}

type SortDirection = 'asc' | 'desc' | null

function getNestedValue(obj: object, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object' && part in (acc as object)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj as unknown)
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  pageSize = 10,
  paginated = true,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else if (sortDir === 'desc') {
        setSortKey(null)
        setSortDir(null)
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  // Sort and paginate data
  const processedData = useMemo(() => {
    let result = [...data]

    // Sort
    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortKey)
        const bVal = getNestedValue(b, sortKey)

        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        const comparison = aVal < bVal ? -1 : 1
        return sortDir === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, sortKey, sortDir])

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const paginatedData = paginated
    ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processedData

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (sortKey !== column.key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-foreground" />
    ) : (
      <ChevronDown className="h-4 w-4 text-foreground" />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const isSortable = column.sortable !== false
                return (
                  <TableHead
                    key={String(column.key)}
                    className={cn(
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className,
                      isSortable && 'cursor-pointer select-none hover:bg-muted/50'
                    )}
                    onClick={() => isSortable && handleSort(String(column.key))}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        column.align === 'center' && 'justify-center',
                        column.align === 'right' && 'justify-end'
                      )}
                    >
                      {column.header}
                      {isSortable && <SortIcon column={column} />}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow
                  key={String((row as Record<string, unknown>)[keyField as string])}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => {
                    const value = getNestedValue(row, String(column.key))
                    return (
                      <TableCell
                        key={String(column.key)}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                        {column.render ? column.render(value, row) : String(value ?? '')}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
