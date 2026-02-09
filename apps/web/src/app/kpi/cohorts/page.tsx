'use client'

import { useState } from 'react'
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
import { DollarSign, Users, TrendingUp, Target, Loader2 } from 'lucide-react'

// EPL & LTV data from sample-data.json
const mockCohortChartData = [
  { day: 1, epl: 0, ltv: 0 },
  { day: 7, epl: 2.5, ltv: 15 },
  { day: 14, epl: 8.2, ltv: 45 },
  { day: 35, epl: 25.6, ltv: 180 },
  { day: 65, epl: 48.3, ltv: 420 },
  { day: 95, epl: 72.1, ltv: 750 },
  { day: 185, epl: 125.4, ltv: 1250 },
  { day: 370, epl: 185.2, ltv: 1850 },
]

// Cohort progression data from sample-data.json
const mockCohortData: CohortData[] = [
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

// Key metrics
const metrics = {
  day35EPL: { current: 25.6, change: 12.3, trend: 'up' as const },
  day65EPL: { current: 48.3, change: 8.7, trend: 'up' as const },
  day95EPL: { current: 72.1, change: 15.2, trend: 'up' as const },
  avgLTV: { current: 1850, change: 22.4, trend: 'up' as const },
}

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

        {/* EPL Milestone Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Day 35 EPL"
            value={`$${metrics.day35EPL.current.toFixed(2)}`}
            change={metrics.day35EPL.change}
            trend={metrics.day35EPL.trend}
            icon={DollarSign}
            description="Earnings per lead at 35 days"
          />
          <MetricCard
            title="Day 65 EPL"
            value={`$${metrics.day65EPL.current.toFixed(2)}`}
            change={metrics.day65EPL.change}
            trend={metrics.day65EPL.trend}
            icon={TrendingUp}
            description="Earnings per lead at 65 days"
          />
          <MetricCard
            title="Day 95 EPL"
            value={`$${metrics.day95EPL.current.toFixed(2)}`}
            change={metrics.day95EPL.change}
            trend={metrics.day95EPL.trend}
            icon={Target}
            description="Earnings per lead at 95 days"
          />
          <MetricCard
            title="Average LTV"
            value={`$${metrics.avgLTV.current.toLocaleString()}`}
            change={metrics.avgLTV.change}
            trend={metrics.avgLTV.trend}
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
                  data={mockCohortData}
                  metric={cohortMetric}
                  showRates
                  weeksToShow={6}
                />
                <CohortTableLegend metric={metricLabels[cohortMetric]} />
              </CardContent>
            </Card>

            {/* Cohort Insights */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Best Performing Cohort</CardTitle>
                  <CardDescription>Highest conversion rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">2026-W02</span>
                      <span className="text-sm text-green-600 font-medium">34.6% to HR</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      52 leads, 18 hand raisers by week 3
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Latest Cohort</CardTitle>
                  <CardDescription>2026-W05 (current week)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">72 leads</span>
                      <span className="text-sm text-blue-600 font-medium">14 HR (19.4%)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      On track vs. historical averages
                    </p>
                  </div>
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
                <CohortChart data={mockCohortChartData} />
              </CardContent>
            </Card>

            {/* EPL Milestones Table */}
            <Card>
              <CardHeader>
                <CardTitle>EPL Milestones</CardTitle>
                <CardDescription>Key earnings checkpoints for cohort analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockCohortChartData.slice(1).map((point) => (
                    <div key={point.day} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium w-16">Day {point.day}</span>
                        <div className="h-2 w-48 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{
                              width: `${(point.epl / mockCohortChartData[mockCohortChartData.length - 1].epl) * 100}%`,
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
