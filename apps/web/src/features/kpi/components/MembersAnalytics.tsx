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
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { MembersChart } from '../charts/MembersChart'
import { useMembersAnalytics } from '../hooks/use-kpi-data'

interface DateRange {
  from: Date
  to: Date
}

interface MembersAnalyticsProps {
  /** Page-level date range filter (takes precedence over dropdown) */
  dateRange?: DateRange
  /** Attribution sources to filter by (empty = all sources) */
  sources?: string[]
  /** Additional CSS classes */
  className?: string
}

type TimeRange = '30d' | '1y'

const rangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: '30d', label: 'Last 30 days' },
  { value: '1y', label: 'Last 1 year' },
]

/**
 * MembersAnalytics - Card component displaying member count history
 * Includes a dropdown to switch between daily (30 days) and monthly (1 year) views
 */
export function MembersAnalytics({
  dateRange: pageDateRange,
  sources,
  className,
}: MembersAnalyticsProps) {
  const [range, setRange] = useState<TimeRange>('30d')

  const { data, isLoading, error } = useMembersAnalytics({
    range,
    dateRange: pageDateRange,
    sources,
  })

  // Determine which data to display based on range
  const chartData = range === '30d' ? data?.daily : data?.monthly
  const chartView = range === '30d' ? 'daily' : 'monthly'

  // Calculate growth trend
  const getGrowth = () => {
    if (!data?.totals) return null
    const growth = Number(data.totals.growth)
    if (isNaN(growth)) return null
    return {
      value: Math.abs(growth),
      positive: growth >= 0,
      neutral: growth === 0,
    }
  }

  const growth = getGrowth()

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
          <h2 className="text-base font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Total and new members over time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Growth indicator */}
          {growth && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded',
                growth.positive
                  ? 'bg-green-100 text-green-700'
                  : growth.neutral
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-red-100 text-red-700'
              )}
            >
              {growth.positive ? (
                <TrendingUp className="h-4 w-4" />
              ) : growth.neutral ? (
                <Minus className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{growth.value.toFixed(1)}%</span>
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
        <MembersChart data={chartData} view={chartView} height={350} />
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center h-[350px] text-muted-foreground">
          <div className="text-center">
            <p className="font-medium">No data available</p>
            <p className="text-sm mt-1">
              Run member history sync to populate data
            </p>
          </div>
        </div>
      ) : null}

      {/* Summary Stats */}
      {data && data.totals && !isLoading && (
        <div className="flex gap-6 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground">Current</p>
            <p className="text-lg font-semibold">
              {data.totals.currentMembers.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Start of Period</p>
            <p className="text-lg font-semibold">
              {data.totals.startMembers.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">New in Period</p>
            <p className="text-lg font-semibold text-green-600">
              +{data.totals.newMembersInPeriod.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Daily</p>
            <p className="text-lg font-semibold">
              {data.totals.avgDailyMembers.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
