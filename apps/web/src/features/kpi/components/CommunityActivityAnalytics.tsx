'use client'

import { useState } from 'react'
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@0ne/ui'
import { Loader2, Activity, Users, Flame } from 'lucide-react'
import { CommunityActivityChart } from '../charts/CommunityActivityChart'
import { useCommunityActivityAnalytics } from '../hooks/use-kpi-data'
import { format, parseISO } from 'date-fns'

interface DateRange {
  from: Date
  to: Date
}

interface CommunityActivityAnalyticsProps {
  /** Page-level date range filter (takes precedence over dropdown) */
  dateRange?: DateRange
  /** Additional CSS classes */
  className?: string
}

type TimeRange = '30d' | '1y'

const rangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: '30d', label: 'Last 30 days' },
  { value: '1y', label: 'Last 1 year' },
]

/**
 * CommunityActivityAnalytics - Card component displaying community engagement over time
 * Includes a dropdown to switch between daily (30 days) and monthly (1 year) views
 */
export function CommunityActivityAnalytics({
  dateRange: pageDateRange,
  className,
}: CommunityActivityAnalyticsProps) {
  const [range, setRange] = useState<TimeRange>('30d')

  const { data, isLoading, error } = useCommunityActivityAnalytics({
    range,
    dateRange: pageDateRange,
  })

  // Determine which data to display based on range
  const chartData = range === '30d' ? data?.daily : data?.monthly
  const chartView = range === '30d' ? 'daily' : 'monthly'

  // Format peak day date
  const formatPeakDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      return format(date, 'MMM d')
    } catch {
      return dateStr
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-5',
        'shadow-[0_1px_2px_rgba(34,32,29,0.05)]',
        className
      )}
    >
      {/* Header with title and dropdown */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Community Activity</h2>
          <p className="text-sm text-muted-foreground">
            Engagement and active members over time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Peak indicator */}
          {data?.totals?.peakDay && (
            <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded bg-purple-100 text-purple-700">
              <Flame className="h-4 w-4" />
              <span>Peak: {formatPeakDate(data.totals.peakDay.date)}</span>
            </div>
          )}

          {/* Range Selector Dropdown */}
          <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px] h-9 border bg-background shadow-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-[350px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center h-[350px]">
          <div className="text-center">
            <p className="text-destructive font-medium">Failed to load data</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {data && !isLoading && chartData && chartData.length > 0 ? (
        <CommunityActivityChart data={chartData} view={chartView} height={350} />
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center h-[350px] text-muted-foreground">
          <div className="text-center">
            <p className="font-medium">No data available</p>
            <p className="text-sm mt-1">
              Run community activity sync to populate data
            </p>
          </div>
        </div>
      ) : null}

      {/* Summary Stats */}
      {data && data.totals && !isLoading && (
        <div className="flex gap-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Activity</p>
              <p className="text-lg font-semibold">
                {data.totals.totalActivity.toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Daily Activity</p>
            <p className="text-lg font-semibold">
              {data.totals.avgDailyActivity.toLocaleString()}
            </p>
          </div>
          {data.totals.avgDailyActiveMembers !== null && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg. Active/Day</p>
                <p className="text-lg font-semibold">
                  {data.totals.avgDailyActiveMembers.toLocaleString()}
                </p>
              </div>
            </div>
          )}
          {data.totals.peakDay && (
            <div>
              <p className="text-sm text-muted-foreground">Peak Activity</p>
              <p className="text-lg font-semibold">
                {data.totals.peakDay.count.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
