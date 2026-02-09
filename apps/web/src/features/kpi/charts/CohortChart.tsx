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

export interface CohortDataPoint {
  day: number
  epl: number
  ltv: number
}

interface CohortChartProps {
  data: CohortDataPoint[]
}

export function CohortChart({ data }: CohortChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorEpl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorLtv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickFormatter={(value) => `Day ${value}`}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(value) => `$${value}`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload as CohortDataPoint
              return (
                <div className="rounded-lg border bg-background p-3 shadow-sm">
                  <p className="font-medium">Day {data.day}</p>
                  <p className="text-sm text-green-600">
                    EPL: ${data.epl.toFixed(2)}
                  </p>
                  <p className="text-sm text-blue-600">
                    LTV: ${data.ltv.toLocaleString()}
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="epl"
          name="EPL"
          stroke="#22c55e"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorEpl)"
        />
        <Area
          type="monotone"
          dataKey="ltv"
          name="LTV"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorLtv)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
