'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@0ne/ui'
import { AppShell } from '@/components/shell'
import { CohortChart } from '@/features/kpi/charts/CohortChart'
import { FilterBar } from '@/features/kpi/components/FilterBar'
import { CohortTable, CohortTableLegend, type CohortData } from '@/features/kpi/components/CohortTable'
import { MetricCard } from '@/features/kpi/components/MetricCard'
import { usePersistedFilters } from '@/features/kpi/hooks/use-persisted-filters'
import { useCohortsData } from '@/features/kpi/hooks/use-kpi-data'
import { DollarSign, Users, TrendingUp, Target, Loader2, AlertCircle } from 'lucide-react'
import { COHORT_DAYS } from '@/features/kpi/lib/config'

// Mock data for funnel progression table (requires separate API for week-based stage tracking)
// TODO: Create /api/kpi/cohort-progression endpoint for real funnel stage data
const mockCohortProgressionData: CohortData[] = [
  {
    cohort: '2026-W01',
    startDate: '2026-01-06',
    initialLeads: 45,
    week1: { handRaisers: 8, qualified: 2, clients: 0 },
    week2: { handRaisers: 12, qualified: 4, clients: 1 },
    week3: { handRaisers: 14, qualified: 5, clients: 2 },
    week4: { handRaisers: 15, qualified: 6, clients: 3 },
  },
  {
    cohort: '2026-W02',
    startDate: '2026-01-13',
    initialLeads: 52,
    week1: { handRaisers: 10, qualified: 3, clients: 0 },
    week2: { handRaisers: 15, qualified: 5, clients: 1 },
    week3: { handRaisers: 18, qualified: 7, clients: 2 },
  },
  {
    cohort: '2026-W03',
    startDate: '2026-01-20',
    initialLeads: 48,
    week1: { handRaisers: 9, qualified: 2, clients: 0 },
    week2: { handRaisers: 14, qualified: 5, clients: 1 },
  },
  {
    cohort: '2026-W04',
    startDate: '2026-01-27',
    initialLeads: 65,
    week1: { handRaisers: 12, qualified: 4, clients: 1 },
  },
  {
    cohort: '2026-W05',
    startDate: '2026-02-03',
    initialLeads: 72,
    week1: { handRaisers: 14, qualified: 5, clients: 0 },
  },
]

type CohortMetric = 'handRaisers' | 'qualified' | 'clients'

const metricLabels: Record<CohortMetric, string> = {
  handRaisers: 'Hand Raisers',
  qualified: 'Qualified',
  clients: 'Clients',
}

export default function CohortsPage() {
  // Use persisted filters (shared across all KPI pages)
  const {
    period,
    dateRange,
    sources,
    isLoaded,
    hasActiveFilters,
    setPeriod,
    setDateRange,
    setSources,
    resetFilters,
  } = usePersistedFilters()
  const [cohortMetric, setCohortMetric] = useState<CohortMetric>('handRaisers')
  const [viewType, setViewType] = useState<'progression' | 'epl'>('progression')

  // Fetch live cohorts data
  const { data: cohortsData, isLoading: cohortsLoading, error: cohortsError } = useCohortsData({
    sources,
    weeks: 12, // 12 weeks of data
  })

  // Transform API cohort data to chart format (EPL/LTV progression by day)
  const cohortChartData = useMemo(() => {
    if (!cohortsData?.cohorts || cohortsData.cohorts.length === 0) {
      return COHORT_DAYS.map(day => ({ day, epl: 0, ltv: 0 }))
    }

    // Calculate average EPL/LTV across all cohorts for each day milestone
    const dayAverages: Record<number, { totalEpl: number; totalLtv: number; count: number }> = {}

    for (const cohort of cohortsData.cohorts) {
      for (const [dayStr, data] of Object.entries(cohort.progression)) {
        const day = Number(dayStr)
        if (!dayAverages[day]) {
          dayAverages[day] = { totalEpl: 0, totalLtv: 0, count: 0 }
        }
        dayAverages[day].totalEpl += data.epl
        dayAverages[day].totalLtv += data.ltv
        dayAverages[day].count++
      }
    }

    return COHORT_DAYS.map(day => ({
      day,
      epl: dayAverages[day]?.count > 0
        ? Math.round((dayAverages[day].totalEpl / dayAverages[day].count) * 100) / 100
        : 0,
      ltv: dayAverages[day]?.count > 0
        ? Math.round((dayAverages[day].totalLtv / dayAverages[day].count) * 100) / 100
        : 0,
    }))
  }, [cohortsData])

  // Extract EPL at specific milestones for metric cards
  const getEplAtDay = (day: number): number => {
    const point = cohortChartData.find(d => d.day === day)
    return point?.epl || 0
  }

  // Calculate average LTV (from latest milestone data)
  const avgLtv = useMemo(() => {
    const latestWithData = [...cohortChartData].reverse().find(d => d.ltv > 0)
    return latestWithData?.ltv || 0
  }, [cohortChartData])

  if (!isLoaded) {
    return (
      <AppShell title="KPI Dashboard" appId="kpi">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="KPI Dashboard" appId="kpi">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cohort Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Track EPL, LTV, and cohort progression over time
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onPeriodChange={setPeriod}
          period={period}
          sources={sources}
          onSourcesChange={setSources}
          showSourceFilter
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        {/* Error state */}
        {cohortsError && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-2 py-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Failed to load cohort data: {cohortsError.message}</p>
            </CardContent>
          </Card>
        )}

        {/* EPL Milestone Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Day 35 EPL"
            value={cohortsLoading ? '--' : `$${getEplAtDay(35).toFixed(2)}`}
            icon={DollarSign}
            description="Earnings per lead at 35 days"
          />
          <MetricCard
            title="Day 65 EPL"
            value={cohortsLoading ? '--' : `$${getEplAtDay(65).toFixed(2)}`}
            icon={TrendingUp}
            description="Earnings per lead at 65 days"
          />
          <MetricCard
            title="Day 95 EPL"
            value={cohortsLoading ? '--' : `$${getEplAtDay(95).toFixed(2)}`}
            icon={Target}
            description="Earnings per lead at 95 days"
          />
          <MetricCard
            title="Average LTV"
            value={cohortsLoading ? '--' : `$${avgLtv.toLocaleString()}`}
            icon={Users}
            description="Lifetime value per client"
          />
        </div>

        {/* View Tabs */}
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as 'progression' | 'epl')}>
          <TabsList>
            <TabsTrigger value="progression">Cohort Progression</TabsTrigger>
            <TabsTrigger value="epl">EPL & LTV Curves</TabsTrigger>
          </TabsList>

          {/* Cohort Progression View */}
          <TabsContent value="progression" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Weekly Cohort Progression</CardTitle>
                    <CardDescription>
                      Track how leads from each week progress through the funnel
                    </CardDescription>
                  </div>
                  <Select
                    value={cohortMetric}
                    onValueChange={(v) => setCohortMetric(v as CohortMetric)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="handRaisers">Hand Raisers</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="clients">Clients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CohortTable
                  data={mockCohortProgressionData}
                  metric={cohortMetric}
                  showRates
                  weeksToShow={6}
                />
                <CohortTableLegend metric={metricLabels[cohortMetric]} />
                <p className="text-xs text-muted-foreground italic">
                  Note: Progression data shows sample values. Full implementation requires week-based funnel stage tracking.
                </p>
              </CardContent>
            </Card>

            {/* Cohort Insights */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Best Performing Cohort</CardTitle>
                  <CardDescription>Highest EPL at latest milestone</CardDescription>
                </CardHeader>
                <CardContent>
                  {cohortsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : cohortsData?.cohorts && cohortsData.cohorts.length > 0 ? (
                    (() => {
                      // Find cohort with highest EPL
                      const sortedCohorts = [...cohortsData.cohorts].sort((a, b) => {
                        const aMaxEpl = Math.max(...Object.values(a.progression).map(p => p.epl))
                        const bMaxEpl = Math.max(...Object.values(b.progression).map(p => p.epl))
                        return bMaxEpl - aMaxEpl
                      })
                      const best = sortedCohorts[0]
                      const bestEpl = Math.max(...Object.values(best.progression).map(p => p.epl))
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">{best.cohort}</span>
                            <span className="text-sm text-green-600 font-medium">${bestEpl.toFixed(2)} EPL</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {best.initialLeads} leads starting {best.startDate}
                          </p>
                        </div>
                      )
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground">No cohort data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Latest Cohort</CardTitle>
                  <CardDescription>{cohortsData?.cohorts?.[0]?.cohort || 'Current week'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {cohortsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : cohortsData?.cohorts && cohortsData.cohorts.length > 0 ? (
                    (() => {
                      const latest = cohortsData.cohorts[0]
                      const latestEpl = Object.values(latest.progression).length > 0
                        ? Object.values(latest.progression).slice(-1)[0]?.epl || 0
                        : 0
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">{latest.initialLeads} leads</span>
                            <span className="text-sm text-blue-600 font-medium">${latestEpl.toFixed(2)} EPL</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Started {latest.startDate}
                          </p>
                        </div>
                      )
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground">No cohort data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* EPL & LTV View */}
          <TabsContent value="epl" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>EPL & LTV Over Time</CardTitle>
                <CardDescription>
                  Earnings per lead and lifetime value curves by cohort day
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cohortsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <CohortChart data={cohortChartData} />
                )}
              </CardContent>
            </Card>

            {/* EPL Milestones Table */}
            <Card>
              <CardHeader>
                <CardTitle>EPL Milestones</CardTitle>
                <CardDescription>Key earnings checkpoints for cohort analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {cohortsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cohortChartData.slice(1).map((point) => {
                      const maxEpl = cohortChartData[cohortChartData.length - 1]?.epl || 1
                      return (
                        <div key={point.day} className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium w-16">Day {point.day}</span>
                            <div className="h-2 w-48 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{
                                  width: `${maxEpl > 0 ? (point.epl / maxEpl) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm font-medium">${point.epl.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">EPL</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">${point.ltv.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">LTV</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
