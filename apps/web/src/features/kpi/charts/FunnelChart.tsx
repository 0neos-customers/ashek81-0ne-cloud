'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface FunnelDataPoint {
  stage: string
  count: number
  color?: string
  conversionRate?: number | null
}

interface FunnelChartProps {
  data: FunnelDataPoint[]
}

const DEFAULT_COLORS = ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d']

export function FunnelChart({ data }: FunnelChartProps) {
  // Calculate conversion rates if not provided
  const dataWithRates = data.map((item, index) => {
    if (item.conversionRate !== undefined) return item
    if (index === 0) return { ...item, conversionRate: null }
    const prevCount = data[index - 1].count
    const rate = prevCount > 0 ? (item.count / prevCount) * 100 : 0
    return { ...item, conversionRate: Math.round(rate * 10) / 10 }
  })

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dataWithRates} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis
            dataKey="stage"
            type="category"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as FunnelDataPoint
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="font-medium">{data.stage}</p>
                    <p className="text-sm text-muted-foreground">
                      Count: {data.count.toLocaleString()}
                    </p>
                    {data.conversionRate && (
                      <p className="text-sm text-muted-foreground">
                        Conversion: {data.conversionRate}%
                      </p>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {dataWithRates.map((item, index) => (
              <Cell
                key={`cell-${index}`}
                fill={item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex justify-between border-t pt-4">
        {dataWithRates.slice(0, -1).map((item, index) => (
          <div key={item.stage} className="text-center">
            <div className="text-xs text-muted-foreground">
              {item.stage} → {dataWithRates[index + 1].stage}
            </div>
            <div className="text-lg font-bold">
              {dataWithRates[index + 1].conversionRate || 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
