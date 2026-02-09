'use client'

import * as React from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@0ne/ui'

export interface FunnelStage {
  id: string
  label: string
  count: number
  color?: string
  costPer?: number
}

export interface FunnelFlowData {
  /** Linear stages before the split */
  linearStages: FunnelStage[]
  /** Premium path stages (top branch) */
  premiumPath?: FunnelStage[]
  /** VIP path stages (bottom branch) */
  vipPath?: FunnelStage[]
  /** Total expenses used for cost calculations */
  totalExpenses?: number
  /** Selected expense categories for cost calculation */
  selectedExpenses?: Record<string, number>
}

interface FunnelFlowProps {
  data: FunnelFlowData
}

function StageBox({
  label,
  count,
  costPer,
  color,
  size = 'default',
}: {
  label: string
  count: number
  costPer?: number
  color?: string
  size?: 'default' | 'small'
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border bg-card text-center shadow-sm',
        size === 'default' ? 'p-4 min-w-[110px]' : 'p-3 min-w-[100px]'
      )}
      style={{ borderLeftColor: color, borderLeftWidth: color ? 4 : 1 }}
    >
      <div className={cn(
        'font-medium text-muted-foreground',
        size === 'default' ? 'text-sm' : 'text-xs'
      )}>{label}</div>
      <div className={cn(
        'font-bold',
        size === 'default' ? 'text-2xl' : 'text-xl'
      )}>{count.toLocaleString()}</div>
      {costPer !== undefined && (
        <div className={cn(
          'font-medium text-muted-foreground',
          size === 'default' ? 'text-sm' : 'text-xs'
        )}>
          ${costPer.toFixed(2)}
        </div>
      )}
    </div>
  )
}

function ConversionArrow({ rate }: { rate: number }) {
  return (
    <div className="flex flex-col items-center px-2">
      <ArrowRight className="h-5 w-5 text-muted-foreground" />
      <div className="text-xs font-bold text-primary">{rate.toFixed(1)}%</div>
    </div>
  )
}

function calculateConversionRate(current: number, previous: number): number {
  return previous > 0 ? (current / previous) * 100 : 0
}

function calculateCostPer(count: number, totalExpenses: number): number | undefined {
  if (!totalExpenses || count === 0) return undefined
  return totalExpenses / count
}

export function FunnelFlow({ data }: FunnelFlowProps) {
  const { linearStages, premiumPath, vipPath, totalExpenses = 0 } = data
  const hasSplit = premiumPath && vipPath && premiumPath.length > 0 && vipPath.length > 0

  // Calculate cost per for linear stages
  const linearWithCosts = linearStages.map((stage) => ({
    ...stage,
    costPer: calculateCostPer(stage.count, totalExpenses),
  }))

  // Get last linear stage for split calculations
  const lastLinear = linearStages[linearStages.length - 1]

  // Calculate premium path with costs
  const premiumWithCosts = premiumPath?.map((stage) => ({
    ...stage,
    costPer: calculateCostPer(stage.count, totalExpenses),
  }))

  // Calculate VIP path with costs
  const vipWithCosts = vipPath?.map((stage) => ({
    ...stage,
    costPer: calculateCostPer(stage.count, totalExpenses),
  }))

  // Helper to render a path (row of stages with arrows)
  const renderPath = (
    stages: typeof linearWithCosts,
    originalStages: FunnelStage[],
    size: 'default' | 'small' = 'default',
    defaultColor?: string
  ) => {
    const items: React.ReactNode[] = []
    stages.forEach((stage, index) => {
      // Add box
      items.push(
        <div key={stage.id} className="flex flex-1 items-center justify-center">
          <StageBox
            label={stage.label}
            count={stage.count}
            costPer={stage.costPer}
            color={stage.color || defaultColor}
            size={size}
          />
        </div>
      )
      // Add arrow after box (except last)
      if (index < stages.length - 1) {
        items.push(
          <div key={`arrow-${stage.id}`} className="flex items-center justify-center">
            <ConversionArrow
              rate={calculateConversionRate(
                originalStages[index + 1]?.count || 0,
                stage.count
              )}
            />
          </div>
        )
      }
    })
    return items
  }

  return (
    <div className="overflow-x-auto py-4">
      <div className="flex w-full items-center">
        {/* Linear stages */}
        {renderPath(linearWithCosts, linearStages)}

        {/* Split section */}
        {hasSplit && lastLinear && (
          <>
            {/* Conversion arrow to split */}
            <div className="flex items-center justify-center">
              <ConversionArrow
                rate={calculateConversionRate(
                  (premiumPath?.[0]?.count || 0) + (vipPath?.[0]?.count || 0),
                  lastLinear.count
                )}
              />
            </div>

            {/* Split paths container - CSS grid for column alignment */}
            <div className="flex-[3]">
              {/* Use CSS grid to align columns across both paths */}
              <div
                className="grid gap-y-3"
                style={{
                  gridTemplateColumns: `repeat(${(premiumPath?.length || 0) * 2 - 1}, auto)`,
                }}
              >
                {/* Premium path (top row) */}
                {premiumWithCosts?.map((stage, index) => (
                  <React.Fragment key={`premium-${stage.id}`}>
                    <div className="flex items-center justify-center">
                      <StageBox
                        label={stage.label}
                        count={stage.count}
                        costPer={stage.costPer}
                        color={stage.color}
                        size="small"
                      />
                    </div>
                    {index < (premiumWithCosts?.length || 0) - 1 && (
                      <div className="flex items-center justify-center">
                        <ConversionArrow
                          rate={calculateConversionRate(
                            premiumPath?.[index + 1]?.count || 0,
                            stage.count
                          )}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
                {/* VIP path (bottom row) */}
                {vipWithCosts?.map((stage, index) => (
                  <React.Fragment key={`vip-${stage.id}`}>
                    <div className="flex items-center justify-center">
                      <StageBox
                        label={stage.label}
                        count={stage.count}
                        costPer={stage.costPer}
                        color={stage.color}
                        size="small"
                      />
                    </div>
                    {index < (vipWithCosts?.length || 0) - 1 && (
                      <div className="flex items-center justify-center">
                        <ConversionArrow
                          rate={calculateConversionRate(
                            vipPath?.[index + 1]?.count || 0,
                            stage.count
                          )}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Legacy data format adapter for backwards compatibility */
export interface FunnelFlowDataPoint {
  stage: string
  count: number
  color?: string
}

export function adaptLegacyFunnelData(
  data: FunnelFlowDataPoint[],
  totalExpenses?: number
): FunnelFlowData {
  return {
    linearStages: data.map((d, i) => ({
      id: `stage-${i}`,
      label: d.stage,
      count: d.count,
      color: d.color,
    })),
    totalExpenses,
  }
}
