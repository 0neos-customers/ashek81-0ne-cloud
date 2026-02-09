'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export interface MrrTrendDataPoint {
  month: string // YYYY-MM format
  total: number
  oneTime: number
  recurring: number
}

interface MrrTrendChartProps {
  data: MrrTrendDataPoint[]
  /** Height of the chart (default: 300) */
  height?: number
  /** Show legend (default: true) */
  showLegend?: boolean
}

// Colors matching the app design system
const COLORS = {
  recurring: '#8b5cf6', // Purple for MRR (Skool subscriptions)
  oneTime: '#3b82f6',   // Blue for one-time (GHL payments)
  grid: '#E5E5E5',
  tooltip: {
    bg: '#FFFFFF',
    border: '#E5E5E5',
  },
}

/**
 * Format currency values compactly for axis labels
 */
function formatCurrencyCompact(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value}`
}

/**
 * Format currency values for tooltip display
 */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * MrrTrendChart - Stacked area chart showing MRR + One-Time revenue over time
 */
export function MrrTrendChart({
  data,
  height = 300,
  showLegend = true,
}: MrrTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No MRR data available for this period
      </div>
    )
  }

  // Format X-axis label (month)
  const formatXAxis = (value: string) => {
    try {
      const date = parseISO(`${value}-01`)
      return format(date, 'MMM')
    } catch {
      return value
    }
  }

  // Format tooltip date
  const formatTooltipDate = (value: string) => {
    try {
      const date = parseISO(`${value}-01`)
      return format(date, 'MMMM yyyy')
    } catch {
      return value
    }
  }

  // Calculate max value for Y axis
  const maxTotal = Math.max(...data.map((d) => d.total))
  const yAxisMax = Math.ceil(maxTotal / 500) * 500 || 1000

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorRecurring" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.recurring} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.recurring} stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorOneTime" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.oneTime} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.oneTime} stopOpacity={0.1}/>
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLORS.grid}
          vertical={false}
        />

        {/* X Axis - months */}
        <XAxis
          dataKey="month"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
        />

        {/* Y Axis - Revenue amounts */}
        <YAxis
          tickFormatter={formatCurrencyCompact}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={50}
          domain={[0, yAxisMax]}
        />

        {/* Custom Tooltip */}
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const recurring = payload.find((p) => p.dataKey === 'recurring')
              const oneTime = payload.find((p) => p.dataKey === 'oneTime')
              const total = Number(recurring?.value || 0) + Number(oneTime?.value || 0)

              return (
                <div
                  className="rounded-lg border bg-white p-3 shadow-lg"
                  style={{ borderColor: COLORS.tooltip.border }}
                >
                  <p className="font-semibold text-sm mb-2">
                    {formatTooltipDate(label as string)}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS.recurring }}
                      />
                      <span className="text-muted-foreground">MRR (Skool)</span>
                      <span className="ml-auto font-medium">
                        {formatCurrency(Number(recurring?.value || 0))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS.oneTime }}
                      />
                      <span className="text-muted-foreground">One-Time (GHL)</span>
                      <span className="ml-auto font-medium">
                        {formatCurrency(Number(oneTime?.value || 0))}
                      </span>
                    </div>
                    <div className="border-t pt-1 mt-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-muted-foreground">Total</span>
                        <span className="ml-auto">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />

        {/* Legend */}
        {showLegend && (
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                recurring: 'MRR (Skool)',
                oneTime: 'One-Time (GHL)',
              }
              return labels[value] || value
            }}
          />
        )}

        {/* Stacked Areas */}
        <Area
          type="monotone"
          dataKey="recurring"
          stackId="1"
          stroke={COLORS.recurring}
          fillOpacity={1}
          fill="url(#colorRecurring)"
        />
        <Area
          type="monotone"
          dataKey="oneTime"
          stackId="1"
          stroke={COLORS.oneTime}
          fillOpacity={1}
          fill="url(#colorOneTime)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
