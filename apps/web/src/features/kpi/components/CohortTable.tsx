'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@0ne/ui'

interface CohortWeekData {
  handRaisers: number
  qualified: number
  clients: number
}

export interface CohortData {
  cohort: string
  startDate: string
  initialLeads: number
  week1?: CohortWeekData
  week2?: CohortWeekData
  week3?: CohortWeekData
  week4?: CohortWeekData
  week5?: CohortWeekData
  week6?: CohortWeekData
  week7?: CohortWeekData
  week8?: CohortWeekData
}

interface CohortTableProps {
  data: CohortData[]
  /** Which metric to display in cells */
  metric?: 'handRaisers' | 'qualified' | 'clients'
  /** Whether to show rates instead of counts */
  showRates?: boolean
  /** Number of weeks to display */
  weeksToShow?: number
  /** Empty state message */
  emptyMessage?: string
}

function formatRate(count: number, total: number): string {
  if (total === 0) return '0%'
  return `${((count / total) * 100).toFixed(1)}%`
}

function getCellColor(rate: number): string {
  // Color scale from light to dark based on conversion rate
  if (rate >= 20) return 'bg-green-100 text-green-900'
  if (rate >= 15) return 'bg-green-50 text-green-800'
  if (rate >= 10) return 'bg-emerald-50 text-emerald-800'
  if (rate >= 5) return 'bg-teal-50 text-teal-800'
  if (rate > 0) return 'bg-slate-50 text-slate-700'
  return 'bg-muted/30 text-muted-foreground'
}

export function CohortTable({
  data,
  metric = 'handRaisers',
  showRates = true,
  weeksToShow = 8,
  emptyMessage = 'No cohort data available',
}: CohortTableProps) {
  const weeks = Array.from({ length: weeksToShow }, (_, i) => i + 1)

  const getWeekData = (row: CohortData, week: number): CohortWeekData | undefined => {
    const key = `week${week}` as keyof CohortData
    return row[key] as CohortWeekData | undefined
  }

  const getCellValue = (row: CohortData, week: number): { display: string; rate: number } => {
    const weekData = getWeekData(row, week)
    if (!weekData) return { display: '-', rate: 0 }

    const count = weekData[metric]
    const rate = (count / row.initialLeads) * 100

    if (showRates) {
      return { display: formatRate(count, row.initialLeads), rate }
    }
    return { display: String(count), rate }
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Cohort</TableHead>
            <TableHead className="w-[80px] text-right">Leads</TableHead>
            {weeks.map((week) => (
              <TableHead key={week} className="text-center w-[80px]">
                W{week}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.cohort}>
              <TableCell className="font-medium">{row.cohort}</TableCell>
              <TableCell className="text-right">{row.initialLeads}</TableCell>
              {weeks.map((week) => {
                const { display, rate } = getCellValue(row, week)
                const hasData = display !== '-'
                return (
                  <TableCell
                    key={week}
                    className={cn(
                      'text-center text-sm',
                      hasData && getCellColor(rate)
                    )}
                  >
                    {display}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Legend component showing the color scale */
export function CohortTableLegend({ metric }: { metric: string }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>Conversion rate:</span>
      <div className="flex items-center gap-2">
        <span className={cn('px-2 py-0.5 rounded', getCellColor(0))}>0%</span>
        <span className={cn('px-2 py-0.5 rounded', getCellColor(5))}>5%</span>
        <span className={cn('px-2 py-0.5 rounded', getCellColor(10))}>10%</span>
        <span className={cn('px-2 py-0.5 rounded', getCellColor(15))}>15%</span>
        <span className={cn('px-2 py-0.5 rounded', getCellColor(20))}>20%+</span>
      </div>
      <span className="ml-2">({metric})</span>
    </div>
  )
}
