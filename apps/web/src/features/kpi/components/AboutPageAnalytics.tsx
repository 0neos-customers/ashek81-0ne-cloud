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
import { Loader2 } from 'lucide-react'
import { AboutPageChart } from '../charts/AboutPageChart'
import { useAboutPageAnalytics } from '../hooks/use-kpi-data'

interface DateRange {
  from: Date
  to: Date
}

interface AboutPageAnalyticsProps {
  /** Use sample data instead of live API */
  useSampleData?: boolean
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
 * AboutPageAnalytics - Card component displaying about page visitor analytics
 * Includes a dropdown to switch between daily (30 days) and monthly (1 year) views
 */
export function AboutPageAnalytics({
  useSampleData = false,
  dateRange: pageDateRange,
  className,
}: AboutPageAnalyticsProps) {
  const [range, setRange] = useState<TimeRange>('30d')

  const { data, isLoading, error } = useAboutPageAnalytics({
    range,
    dateRange: pageDateRange, // Page-level filter takes precedence
    useSampleData,
  })

  // Determine which data to display based on range
  const chartData = range === '30d' ? data?.daily : data?.monthly
  const chartView = range === '30d' ? 'daily' : 'monthly'

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
          <h2 className="text-base font-semibold">About page</h2>
          <p className="text-sm text-muted-foreground">
            Visitor traffic and conversion rates
          </p>
        </div>

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
      {data && chartData && !isLoading && (
        <AboutPageChart
          data={chartData.map((d) => ({
            date: 'date' in d ? d.date : '',
            month: 'month' in d ? d.month : '',
            visitors: d.visitors,
            conversionRate: d.conversionRate,
          }))}
          view={chartView}
          height={350}
        />
      )}

      {/* Summary Stats (optional) */}
      {data && !isLoading && (
        <div className="flex gap-6 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground">Total Visitors</p>
            <p className="text-lg font-semibold">
              {data.totals.totalVisitors.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Conversion</p>
            <p className="text-lg font-semibold">
              {data.totals.avgConversionRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {range === '30d' ? 'Daily Avg.' : 'Monthly Avg.'}
            </p>
            <p className="text-lg font-semibold">
              {range === '30d'
                ? data.totals.avgDailyVisitors.toLocaleString()
                : Math.round(data.totals.totalVisitors / 12).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
