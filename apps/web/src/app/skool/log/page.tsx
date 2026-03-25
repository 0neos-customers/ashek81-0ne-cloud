'use client'

import { useState } from 'react'
import {
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@0ne/ui'
import { ChevronLeft, ChevronRight, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { DAY_NAMES, formatScheduleTime, type SchedulerExecutionStatus } from '@0ne/db'
import { useExecutionLog } from '@/features/skool/hooks'

const PAGE_SIZE = 20

export default function ExecutionLogPage() {
  const [statusFilter, setStatusFilter] = useState<SchedulerExecutionStatus | 'all'>('all')
  const [offset, setOffset] = useState(0)

  const { logs, total, hasMore, isLoading, refresh } = useExecutionLog({
    limit: PAGE_SIZE,
    offset,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const handlePrevPage = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNextPage = () => {
    if (hasMore) {
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value as SchedulerExecutionStatus | 'all')
    setOffset(0) // Reset to first page when filter changes
  }

  const getStatusBadge = (status: SchedulerExecutionStatus) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500 hover:bg-green-600">Success</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'skipped':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
            Skipped
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Execution Log</h1>
          <p className="text-muted-foreground">History of all scheduled posts.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">
            {statusFilter !== 'all'
              ? `No ${statusFilter} executions found.`
              : 'No execution logs yet. Posts will appear here after scheduled runs.'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Post Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.executedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.scheduler?.category || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.scheduler ? (
                        <>
                          {DAY_NAMES[log.scheduler.dayOfWeek]}{' '}
                          {formatScheduleTime(log.scheduler.time)}
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.post?.title || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {log.skoolPostUrl ? (
                        <a
                          href={log.skoolPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : log.errorMessage ? (
                        <span
                          className="text-destructive text-sm cursor-help"
                          title={log.errorMessage}
                        >
                          Error
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} to {Math.min(offset + PAGE_SIZE, total)} of {total} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Stats summary */}
      {!isLoading && logs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center p-4 rounded-lg bg-green-500/10">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter((l) => l.status === 'success').length}
            </div>
            <div className="text-sm text-muted-foreground">Successful (this page)</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-500/10">
            <div className="text-2xl font-bold text-red-600">
              {logs.filter((l) => l.status === 'failed').length}
            </div>
            <div className="text-sm text-muted-foreground">Failed (this page)</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-yellow-500/10">
            <div className="text-2xl font-bold text-yellow-600">
              {logs.filter((l) => l.status === 'skipped').length}
            </div>
            <div className="text-sm text-muted-foreground">Skipped (this page)</div>
          </div>
        </div>
      )}
    </div>
  )
}
