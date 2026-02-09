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

export interface CommunityActivityDataPoint {
  date: string // For daily view: YYYY-MM-DD
  month?: string // For monthly view: YYYY-MM
  activityCount: number
  dailyActiveMembers?: number | null
  avgDailyActiveMembers?: number | null
}

interface CommunityActivityChartProps {
  data: CommunityActivityDataPoint[]
  /** 'daily' for 30-day view, 'monthly' for 1-year view */
  view: 'daily' | 'monthly'
  /** Height of the chart (default: 350) */
  height?: number
}

// Colors
const COLORS = {
  activityCount: '#8B5CF6', // Purple for activity count area
  activityCountLight: '#8B5CF620', // Light purple for area fill
  activeMembers: '#F59E0B', // Amber for active members line
  grid: '#E5E5E5',
  tooltip: {
    bg: '#FFFFFF',
    border: '#E5E5E5',
  },
}

/**
 * CommunityActivityChart - Displays community activity (area) with daily active members overlay (line)
 */
export function CommunityActivityChart({
  data,
  view,
  height = 350,
}: CommunityActivityChartProps) {
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

  // Get the active members key based on view
  const activeMembersKey =
    view === 'monthly' ? 'avgDailyActiveMembers' : 'dailyActiveMembers'

  // Calculate max values for Y-axes
  const maxActivity = Math.max(...data.map((d) => d.activityCount))
  const activeMembersValues = data.map((d) =>
    view === 'monthly'
      ? d.avgDailyActiveMembers || 0
      : d.dailyActiveMembers || 0
  )
  const maxActiveMembers = Math.max(...activeMembersValues)

  // Nice rounded max values for axes
  const activityAxisMax = Math.ceil(maxActivity / 100) * 100 || 500
  const activeMembersAxisMax = Math.ceil(maxActiveMembers / 50) * 50 || 100

  // Get the data key for X axis based on view
  const xDataKey = view === 'monthly' ? 'month' : 'date'

  // Check if we have any active members data
  const hasActiveMembers = activeMembersValues.some((v) => v > 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: hasActiveMembers ? 60 : 20, left: 20, bottom: 20 }}
      >
        <defs>
          <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.activityCount} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.activityCount} stopOpacity={0.05} />
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

        {/* Left Y Axis - Activity Count */}
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[0, activityAxisMax]}
          tickFormatter={(value) => value.toLocaleString()}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          width={50}
        />

        {/* Right Y Axis - Active Members (only if we have data) */}
        {hasActiveMembers && (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, activeMembersAxisMax]}
            tickFormatter={(value) => value.toLocaleString()}
            tick={{ fontSize: 12, fill: '#666' }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
        )}

        {/* Custom Tooltip */}
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const activity = payload.find((p) => p.dataKey === 'activityCount')
              const activeM = payload.find(
                (p) =>
                  p.dataKey === 'dailyActiveMembers' ||
                  p.dataKey === 'avgDailyActiveMembers'
              )

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
                        style={{ backgroundColor: COLORS.activityCount }}
                      />
                      <span className="text-muted-foreground">Activity</span>
                      <span className="ml-auto font-medium">
                        {Number(activity?.value || 0).toLocaleString()}
                      </span>
                    </div>
                    {activeM?.value !== null && activeM?.value !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: COLORS.activeMembers }}
                        />
                        <span className="text-muted-foreground">
                          {view === 'monthly' ? 'Avg Active' : 'Active Members'}
                        </span>
                        <span className="ml-auto font-medium">
                          {Number(activeM?.value || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
            return null
          }}
        />

        {/* Area for Activity Count */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="activityCount"
          stroke={COLORS.activityCount}
          strokeWidth={2}
          fill="url(#activityGradient)"
        />

        {/* Line for Active Members (only if we have data) */}
        {hasActiveMembers && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={activeMembersKey}
            stroke={COLORS.activeMembers}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.activeMembers }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
