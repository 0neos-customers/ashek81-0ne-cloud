'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export interface RevenueTrendDataPoint {
  date: string // YYYY-MM-DD for daily, YYYY-MM for monthly
  setupFees: number
  fundingFees: number
  total: number
}

interface RevenueTrendChartProps {
  data: RevenueTrendDataPoint[]
  /** Height of the chart (default: 350) */
  height?: number
}

// Colors matching the app design system
const COLORS = {
  setupFees: '#3b82f6',    // Blue for setup fees (PREIFM)
  fundingFees: '#22c55e',  // Green for funding fees (success fees)
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
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/**
 * Detect if data is monthly (YYYY-MM) or daily (YYYY-MM-DD)
 */
function isMonthlyData(data: RevenueTrendDataPoint[]): boolean {
  if (data.length === 0) return false
  // Monthly format: YYYY-MM (7 chars), Daily format: YYYY-MM-DD (10 chars)
  return data[0].date.length === 7
}

/**
 * RevenueTrendChart - Stacked bar chart showing Setup Fees + Funding Fees
 */
export function RevenueTrendChart({
  data,
  height = 350,
}: RevenueTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        No revenue data available for this period
      </div>
    )
  }

  const isMonthly = isMonthlyData(data)

  // Format X-axis label based on data type
  const formatXAxis = (value: string) => {
    try {
      if (isMonthly) {
        // Monthly: "Jan", "Feb", etc.
        const date = parseISO(`${value}-01`)
        return format(date, 'MMM')
      } else {
        // Daily: "Jan 8", "Jan 9", etc.
        const date = parseISO(value)
        return format(date, 'MMM d')
      }
    } catch {
      return value
    }
  }

  // Format tooltip date
  const formatTooltipDate = (value: string) => {
    try {
      if (isMonthly) {
        const date = parseISO(`${value}-01`)
        return format(date, 'MMMM yyyy')
      } else {
        const date = parseISO(value)
        return format(date, 'MMMM d, yyyy')
      }
    } catch {
      return value
    }
  }

  // Calculate max value for Y axis
  const maxTotal = Math.max(...data.map((d) => d.total))
  const yAxisMax = Math.ceil(maxTotal / 5000) * 5000 || 10000

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLORS.grid}
          vertical={false}
        />

        {/* X Axis - dates or months */}
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          interval={isMonthly ? 0 : 'preserveStartEnd'}
        />

        {/* Y Axis - Revenue amounts */}
        <YAxis
          tickFormatter={formatCurrencyCompact}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={55}
          domain={[0, yAxisMax]}
        />

        {/* Custom Tooltip */}
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const setupFees = payload.find((p) => p.dataKey === 'setupFees')
              const fundingFees = payload.find((p) => p.dataKey === 'fundingFees')
              const total = Number(setupFees?.value || 0) + Number(fundingFees?.value || 0)

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
                        style={{ backgroundColor: COLORS.setupFees }}
                      />
                      <span className="text-muted-foreground">Setup Fees</span>
                      <span className="ml-auto font-medium">
                        {formatCurrency(Number(setupFees?.value || 0))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS.fundingFees }}
                      />
                      <span className="text-muted-foreground">Funding Fees</span>
                      <span className="ml-auto font-medium">
                        {formatCurrency(Number(fundingFees?.value || 0))}
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
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              setupFees: 'Setup Fees (PREIFM)',
              fundingFees: 'Funding Fees (7%)',
            }
            return labels[value] || value
          }}
        />

        {/* Stacked Bars */}
        <Bar
          dataKey="setupFees"
          stackId="revenue"
          fill={COLORS.setupFees}
          radius={[0, 0, 0, 0]}
          barSize={isMonthly ? 40 : 20}
        />
        <Bar
          dataKey="fundingFees"
          stackId="revenue"
          fill={COLORS.fundingFees}
          radius={[4, 4, 0, 0]}
          barSize={isMonthly ? 40 : 20}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
