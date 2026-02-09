'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export interface MembersDataPoint {
  date: string        // For daily view: YYYY-MM-DD
  month?: string      // For monthly view: YYYY-MM
  totalMembers: number
  newMembers: number
}

interface MembersChartProps {
  data: MembersDataPoint[]
  /** 'daily' for 30-day view, 'monthly' for 1-year view */
  view: 'daily' | 'monthly'
  /** Height of the chart (default: 350) */
  height?: number
}

// Colors
const COLORS = {
  totalMembers: '#3B82F6',    // Blue for total members area
  totalMembersLight: '#3B82F620', // Light blue for area fill
  newMembers: '#22C55E',       // Green for new members line
  grid: '#E5E5E5',
  tooltip: {
    bg: '#FFFFFF',
    border: '#E5E5E5',
  },
}

/**
 * MembersChart - Displays total member count (area) with new members overlay (line)
 */
export function MembersChart({
  data,
  view,
  height = 350,
}: MembersChartProps) {
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

  // Calculate max values for Y-axes
  const maxMembers = Math.max(...data.map((d) => d.totalMembers))
  const maxNewMembers = Math.max(...data.map((d) => d.newMembers))

  // Nice rounded max values for axes
  const memberAxisMax = Math.ceil(maxMembers / 500) * 500 || 1000
  const newMemberAxisMax = Math.ceil(maxNewMembers / 10) * 10 || 50

  // Get the data key for X axis based on view
  const xDataKey = view === 'monthly' ? 'month' : 'date'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
      >
        <defs>
          <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.totalMembers} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.totalMembers} stopOpacity={0.05} />
          </linearGradient>
        </defs>

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

        {/* Left Y Axis - Total Members */}
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[0, memberAxisMax]}
          tickFormatter={(value) => value.toLocaleString()}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={50}
        />

        {/* Right Y Axis - New Members */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, newMemberAxisMax]}
          tickFormatter={(value) => `+${value}`}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={45}
        />

        {/* Custom Tooltip */}
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const total = payload.find((p) => p.dataKey === 'totalMembers')
              const newM = payload.find((p) => p.dataKey === 'newMembers')

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
                        style={{ backgroundColor: COLORS.totalMembers }}
                      />
                      <span className="text-muted-foreground">Total members</span>
                      <span className="ml-auto font-medium">
                        {Number(total?.value || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS.newMembers }}
                      />
                      <span className="text-muted-foreground">New members</span>
                      <span className="ml-auto font-medium">
                        +{Number(newM?.value || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />

        {/* Area for Total Members */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="totalMembers"
          stroke={COLORS.totalMembers}
          strokeWidth={2}
          fill="url(#memberGradient)"
        />

        {/* Line for New Members */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="newMembers"
          stroke={COLORS.newMembers}
          strokeWidth={2}
          dot={{ r: 3, fill: COLORS.newMembers }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
