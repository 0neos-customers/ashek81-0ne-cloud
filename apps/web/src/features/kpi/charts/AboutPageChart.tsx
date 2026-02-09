'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export interface AboutPageDataPoint {
  date: string        // For daily view: YYYY-MM-DD
  month?: string      // For monthly view: YYYY-MM
  visitors: number
  conversionRate: number
}

interface AboutPageChartProps {
  data: AboutPageDataPoint[]
  /** 'daily' for 30-day view, 'monthly' for 1-year view */
  view: 'daily' | 'monthly'
  /** Height of the chart (default: 350) */
  height?: number
}

// Skool-inspired colors
const COLORS = {
  visitors: '#8ECEB3',      // Mint green for bars (matching Skool)
  conversionRate: '#22201D', // Dark line for conversion rate
  grid: '#E5E5E5',
  tooltip: {
    bg: '#FFFFFF',
    border: '#E5E5E5',
  },
}

/**
 * AboutPageChart - Displays visitor counts (bars) with conversion rate overlay (line)
 * Matches Skool's analytics dashboard design
 */
export function AboutPageChart({
  data,
  view,
  height = 350,
}: AboutPageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        No data available
      </div>
    )
  }

  // Format X-axis label based on view type
  const formatXAxis = (value: string) => {
    try {
      if (view === 'monthly') {
        // Monthly: "Jan", "Feb", etc.
        const date = parseISO(`${value}-01`)
        return format(date, 'MMM')
      } else {
        // Daily: "01/08", "01/09", etc.
        const date = parseISO(value)
        return format(date, 'MM/dd')
      }
    } catch {
      return value
    }
  }

  // Format tooltip date
  const formatTooltipDate = (value: string) => {
    try {
      if (view === 'monthly') {
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

  // Calculate max values for dual Y-axes
  const maxVisitors = Math.max(...data.map((d) => d.visitors))
  const maxConversion = Math.max(...data.map((d) => d.conversionRate))

  // Nice rounded max values for axes
  const visitorAxisMax = Math.ceil(maxVisitors / 50) * 50 || 100
  const conversionAxisMax = Math.ceil(maxConversion / 15) * 15 || 60

  // Get the data key for X axis based on view
  const xDataKey = view === 'monthly' ? 'month' : 'date'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLORS.grid}
          vertical={false}
        />

        {/* X Axis - dates or months */}
        <XAxis
          dataKey={xDataKey}
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          interval={view === 'daily' ? 2 : 0}
        />

        {/* Left Y Axis - Conversion Rate (%) */}
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[0, conversionAxisMax]}
          tickFormatter={(value) => `${value}%`}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={45}
        />

        {/* Right Y Axis - Visitors (count) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, visitorAxisMax]}
          tickFormatter={(value) => value.toLocaleString()}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={50}
        />

        {/* Custom Tooltip */}
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const visitors = payload.find((p) => p.dataKey === 'visitors')
              const conversion = payload.find((p) => p.dataKey === 'conversionRate')

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
                        style={{ backgroundColor: COLORS.conversionRate }}
                      />
                      <span className="text-muted-foreground">Conversion rate</span>
                      <span className="ml-auto font-medium">
                        {Number(conversion?.value || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS.visitors }}
                      />
                      <span className="text-muted-foreground">Visitors</span>
                      <span className="ml-auto font-medium">
                        {Number(visitors?.value || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />

        {/* Bars for Visitors */}
        <Bar
          yAxisId="right"
          dataKey="visitors"
          fill={COLORS.visitors}
          radius={[2, 2, 0, 0]}
          barSize={view === 'monthly' ? 40 : 16}
          opacity={0.9}
        />

        {/* Line for Conversion Rate */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="conversionRate"
          stroke={COLORS.conversionRate}
          strokeWidth={2}
          dot={{ r: 4, fill: COLORS.conversionRate }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
