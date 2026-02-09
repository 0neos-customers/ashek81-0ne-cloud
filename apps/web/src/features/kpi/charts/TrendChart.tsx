'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export interface TrendDataPoint {
  date: string
  [key: string]: string | number | undefined
}

export interface LineConfig {
  key: string
  color: string
  label: string
}

interface TrendChartProps {
  data: TrendDataPoint[]
  /** Custom line configurations. If not provided, auto-detects from data. */
  lines?: LineConfig[]
  /** Height of the chart (default: 300) */
  height?: number
  /** Format function for Y-axis values */
  formatValue?: (value: number) => string
}

// Default colors and labels for backward compatibility
const DEFAULT_COLORS: Record<string, string> = {
  leads: '#3b82f6',
  handRaisers: '#8b5cf6',
  clients: '#22c55e',
  revenue: '#22c55e',
  spend: '#ef4444',
}

const DEFAULT_LABELS: Record<string, string> = {
  leads: 'Leads',
  handRaisers: 'Hand Raisers',
  clients: 'Clients',
  revenue: 'Revenue',
  spend: 'Spend',
}

export function TrendChart({
  data,
  lines,
  height = 300,
  formatValue = (v) => v.toLocaleString(),
}: TrendChartProps) {
  // Determine which keys to render as lines
  const lineConfigs: LineConfig[] = lines ||
    Object.keys(data[0] || {})
      .filter(
        (key) => key !== 'date' && data.some((d) => d[key] !== undefined)
      )
      .map((key) => ({
        key,
        color: DEFAULT_COLORS[key] || '#8884d8',
        label: DEFAULT_LABELS[key] || key,
      }))

  // Create a lookup for labels
  const labelLookup = Object.fromEntries(
    lineConfigs.map((l) => [l.key, l.label])
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            try {
              return format(parseISO(value), 'MMM d')
            } catch {
              return value
            }
          }}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={formatValue}
          className="text-muted-foreground"
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length && typeof label === 'string') {
              let formattedDate = label
              try {
                formattedDate = format(parseISO(label), 'MMM d, yyyy')
              } catch {
                // Use label as-is
              }

              return (
                <div className="rounded-lg border bg-background p-3 shadow-sm">
                  <p className="font-medium">{formattedDate}</p>
                  {payload.map((entry) => (
                    <p
                      key={String(entry.dataKey)}
                      className="text-sm"
                      style={{ color: entry.color }}
                    >
                      {labelLookup[String(entry.dataKey)] || entry.dataKey}:{' '}
                      {typeof entry.value === 'number'
                        ? formatValue(entry.value)
                        : entry.value}
                    </p>
                  ))}
                </div>
              )
            }
            return null
          }}
        />
        <Legend
          formatter={(value) => labelLookup[value] || value}
        />
        {lineConfigs.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 4 }}
            name={line.key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
