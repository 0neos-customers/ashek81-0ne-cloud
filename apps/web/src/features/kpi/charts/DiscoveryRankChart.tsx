'use client'

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export interface DiscoveryRankDataPoint {
  date: string // YYYY-MM-DD
  rank: number
  category?: string
}

interface DiscoveryRankChartProps {
  data: DiscoveryRankDataPoint[]
  /** Height of the chart (default: 300) */
  height?: number
}

// Color scheme
const COLORS = {
  rank: '#8B5CF6', // Purple for rank
  rankFill: 'rgba(139, 92, 246, 0.1)',
  grid: '#E5E5E5',
  reference: '#22201D',
}

/**
 * DiscoveryRankChart - Displays category ranking over time
 * Lower rank = better (rank 1 is #1 in category)
 * Y-axis is inverted so lower rank appears higher on chart
 */
export function DiscoveryRankChart({
  data,
  height = 300,
}: DiscoveryRankChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    )
  }

  // Format X-axis label
  const formatXAxis = (value: string) => {
    try {
      const date = parseISO(value)
      return format(date, 'MM/dd')
    } catch {
      return value
    }
  }

  // Format tooltip date
  const formatTooltipDate = (value: string) => {
    try {
      const date = parseISO(value)
      return format(date, 'MMMM d, yyyy')
    } catch {
      return value
    }
  }

  // Calculate axis domain - invert so lower rank is higher on chart
  // Add some padding
  const maxRank = Math.max(...data.map((d) => d.rank))
  const minRank = Math.min(...data.map((d) => d.rank))
  const padding = Math.ceil((maxRank - minRank) * 0.1) || 50

  // Y-axis domain is reversed (higher number at bottom, lower at top)
  const yDomain = [
    Math.max(1, minRank - padding),
    maxRank + padding,
  ]

  // Current rank for reference line
  const currentRank = data[data.length - 1]?.rank

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
      >
        <defs>
          <linearGradient id="rankGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.rank} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.rank} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLORS.grid}
          vertical={false}
        />

        {/* X Axis - dates */}
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          interval="preserveStartEnd"
        />

        {/* Y Axis - Rank (reversed - lower is better) */}
        <YAxis
          reversed
          domain={yDomain}
          tickFormatter={(value) => `#${value}`}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={50}
        />

        {/* Reference line for current rank */}
        {currentRank && (
          <ReferenceLine
            y={currentRank}
            stroke={COLORS.reference}
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />
        )}

        {/* Custom Tooltip */}
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const rankData = payload[0]
              const category = data.find((d) => d.date === label)?.category

              return (
                <div className="rounded-lg border bg-white p-3 shadow-lg border-border">
                  <p className="font-semibold text-sm mb-2">
                    {formatTooltipDate(label as string)}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS.rank }}
                      />
                      <span className="text-muted-foreground">Rank</span>
                      <span className="ml-auto font-medium">
                        #{Number(rankData?.value || 0)}
                      </span>
                    </div>
                    {category && (
                      <div className="text-xs text-muted-foreground">
                        {category}
                      </div>
                    )}
                  </div>
                </div>
              )
            }
            return null
          }}
        />

        {/* Area chart for rank */}
        <Area
          type="monotone"
          dataKey="rank"
          stroke={COLORS.rank}
          strokeWidth={2}
          fill="url(#rankGradient)"
          dot={{ r: 4, fill: COLORS.rank }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
