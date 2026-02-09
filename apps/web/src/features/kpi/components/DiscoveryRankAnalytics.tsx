'use client'

import { cn } from '@0ne/ui'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { DiscoveryRankChart } from '../charts/DiscoveryRankChart'
import { useDiscoveryRank } from '../hooks/use-kpi-data'

interface DateRange {
  from: Date
  to: Date
}

interface DiscoveryRankAnalyticsProps {
  /** Date range filter from page-level filter */
  dateRange?: DateRange
  /** Additional CSS classes */
  className?: string
}

/**
 * DiscoveryRankAnalytics - Card showing Skool category ranking over time
 * Displays rank history filtered by date range with trend indicator
 */
export function DiscoveryRankAnalytics({
  dateRange,
  className,
}: DiscoveryRankAnalyticsProps) {
  const { data, isLoading, error } = useDiscoveryRank({ dateRange })

  // Calculate trend (compare first vs last data point)
  const getTrend = () => {
    if (!data?.history || data.history.length < 2) return null
    const first = data.history[0]?.rank
    const last = data.history[data.history.length - 1]?.rank
    if (!first || !last) return null
    const diff = first - last // positive = improved (lower rank is better)
    return { diff, improved: diff > 0 }
  }

  const trend = getTrend()

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-5',
        'shadow-[0_1px_2px_rgba(34,32,29,0.05)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Discovery Ranking</h2>
          <p className="text-sm text-muted-foreground">
            Category position over time
          </p>
        </div>

        {/* Current Rank Badge */}
        {data?.current && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-2xl font-bold">#{data.current.rank}</div>
              <div className="text-xs text-muted-foreground">
                {data.current.category}
              </div>
            </div>
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded',
                  trend.improved
                    ? 'bg-green-100 text-green-700'
                    : trend.diff === 0
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-red-100 text-red-700'
                )}
              >
                {trend.improved ? (
                  <TrendingUp className="h-4 w-4" />
                ) : trend.diff === 0 ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(trend.diff)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <p className="text-destructive font-medium">Failed to load data</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {data && !isLoading && (
        <>
          {data.history.length > 1 ? (
            <DiscoveryRankChart data={data.history} height={300} />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <p className="font-medium">Collecting data...</p>
                <p className="text-sm mt-1">
                  Chart will appear after 2+ days of data
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Summary Stats */}
      {data && data.history.length > 1 && !isLoading && (
        <div className="flex gap-6 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground">Best Rank</p>
            <p className="text-lg font-semibold">
              #{Math.min(...data.history.map((d) => d.rank))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Worst Rank</p>
            <p className="text-lg font-semibold">
              #{Math.max(...data.history.map((d) => d.rank))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Rank</p>
            <p className="text-lg font-semibold">
              #
              {Math.round(
                data.history.reduce((sum, d) => sum + d.rank, 0) /
                  data.history.length
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
