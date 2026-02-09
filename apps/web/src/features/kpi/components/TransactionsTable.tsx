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
  Input,
  cn,
} from '@0ne/ui'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface Transaction {
  id: string
  contact_name: string | null
  transaction_type: string
  amount: number
  status: string
  transaction_date: string
}

export interface TransactionsTableProps {
  transactions: Transaction[]
  total: number
  limit: number
  offset: number
  isLoading?: boolean
  onPageChange: (offset: number) => void
  onTypeChange: (type: 'all' | 'setup' | 'funding') => void
  onSearchChange: (search: string) => void
  currentType: 'all' | 'setup' | 'funding'
  currentSearch: string
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getStatusBadge(status: string) {
  const statusLower = status.toLowerCase()
  if (statusLower === 'succeeded') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        Succeeded
      </span>
    )
  }
  if (statusLower === 'failed') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        Failed
      </span>
    )
  }
  if (statusLower === 'pending') {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {status}
    </span>
  )
}

function getTypeBadge(type: string) {
  if (type === 'Setup Fee' || type === 'PREIFM') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
        Setup Fee
      </span>
    )
  }
  if (type === 'Funding Fee' || type === 'New Invoice') {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
        Funding Fee
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {type}
    </span>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TransactionsTable({
  transactions,
  total,
  limit,
  offset,
  isLoading = false,
  onPageChange,
  onTypeChange,
  onSearchChange,
  currentType,
  currentSearch,
}: TransactionsTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [searchInput, setSearchInput] = useState(currentSearch)

  // Calculate pagination
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  // Handle sorting (client-side for current page)
  const sortedTransactions = useMemo(() => {
    if (!sortKey || !sortDir) return transactions

    return [...transactions].sort((a, b) => {
      const aVal = a[sortKey as keyof Transaction]
      const bVal = b[sortKey as keyof Transaction]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      const comparison = aVal < bVal ? -1 : 1
      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [transactions, sortKey, sortDir])

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
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchChange(searchInput)
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-foreground" />
    ) : (
      <ChevronDown className="h-4 w-4 text-foreground" />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by contact name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-4"
          />
        </form>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <div className="flex rounded-md border">
            <Button
              variant={currentType === 'all' ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-none rounded-l-md', currentType === 'all' && 'bg-primary text-primary-foreground')}
              onClick={() => onTypeChange('all')}
            >
              All
            </Button>
            <Button
              variant={currentType === 'setup' ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-none border-l', currentType === 'setup' && 'bg-primary text-primary-foreground')}
              onClick={() => onTypeChange('setup')}
            >
              Setup Fees
            </Button>
            <Button
              variant={currentType === 'funding' ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-none rounded-r-md border-l', currentType === 'funding' && 'bg-primary text-primary-foreground')}
              onClick={() => onTypeChange('funding')}
            >
              Funding Fees
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('transaction_date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon columnKey="transaction_date" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('contact_name')}
              >
                <div className="flex items-center gap-1">
                  Contact
                  <SortIcon columnKey="contact_name" />
                </div>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 text-right"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Amount
                  <SortIcon columnKey="amount" />
                </div>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {currentSearch || currentType !== 'all'
                    ? 'No transactions match your filters'
                    : 'No transactions found in this period'}
                </TableCell>
              </TableRow>
            ) : (
              sortedTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-medium">
                    {formatDate(txn.transaction_date)}
                  </TableCell>
                  <TableCell>
                    {txn.contact_name || <span className="text-muted-foreground italic">Unknown</span>}
                  </TableCell>
                  <TableCell>{getTypeBadge(txn.transaction_type)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(txn.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(txn.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} transactions
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(offset + limit)}
              disabled={currentPage === totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
