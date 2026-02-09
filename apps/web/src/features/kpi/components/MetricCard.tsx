'use client'

import { cn } from '@0ne/ui'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  description?: string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: LucideIcon
  sparkline?: number[]
  /** Whether positive change is good (default) or bad (e.g., for costs) */
  positiveIsGood?: boolean
}

function MiniSparkline({ data, trend }: { data: number[]; trend?: 'up' | 'down' | 'neutral' }) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const height = 24
  const width = 64
  const pointWidth = width / (data.length - 1)

  const points = data.map((value, i) => {
    const x = i * pointWidth
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const strokeColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#a1a1aa'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MetricCard({
  title,
  value,
  description,
  change,
  trend,
  icon: Icon,
  sparkline,
  positiveIsGood = true,
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  // Determine if the change is "good" based on direction and positiveIsGood
  const isGoodChange = positiveIsGood ? trend === 'up' : trend === 'down'
  const isBadChange = positiveIsGood ? trend === 'down' : trend === 'up'

  return (
    <div className={cn(
      'flex flex-col gap-3 rounded-lg border border-border bg-card p-5',
      'shadow-[0_1px_2px_rgba(34,32,29,0.05)]',
      'transition-shadow hover:shadow-[0_2px_8px_rgba(34,32,29,0.08)]'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 text-xs">
              {trend && (
                <TrendIcon
                  className={cn(
                    'h-3.5 w-3.5',
                    isGoodChange && 'text-green-600',
                    isBadChange && 'text-red-500',
                    trend === 'neutral' && 'text-muted-foreground'
                  )}
                />
              )}
              <span
                className={cn(
                  'font-medium',
                  isGoodChange && 'text-green-600',
                  isBadChange && 'text-red-500',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {change > 0 ? '+' : ''}
                {change}%
              </span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          )}
          {description && !change && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>

        {sparkline && sparkline.length > 0 && (
          <MiniSparkline data={sparkline} trend={trend} />
        )}
      </div>
    </div>
  )
}
