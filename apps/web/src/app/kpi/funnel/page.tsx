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
  cn,
} from '@0ne/ui'
import { AppShell } from '@/components/shell'
import { FunnelFlow, type FunnelFlowData } from '@/features/kpi/components/FunnelFlow'
import { FunnelChart } from '@/features/kpi/charts/FunnelChart'
import { FilterBar } from '@/features/kpi/components/FilterBar'
import { DataTable, type Column } from '@/features/kpi/components/DataTable'
import { useKPIOverview, useContactsByStage, type ContactAtStage } from '@/features/kpi/hooks/use-kpi-data'
import { usePersistedFilters } from '@/features/kpi/hooks/use-persisted-filters'
import { buildFunnelFlowData, SAMPLE_FUNNEL_FLOW_DATA } from '@/features/kpi/lib/funnel-utils'
import { Loader2 } from 'lucide-react'
import type { FunnelStage } from '@0ne/db/types/kpi'

// Use shared sample funnel data (colors match config.ts)
const funnelFlowData: FunnelFlowData = {
  ...SAMPLE_FUNNEL_FLOW_DATA,
  totalExpenses: 5720, // Default to ad spend
}

// Legacy bar chart data
const mockFunnelData = [
  { stage: 'About Visits', count: 8500, color: '#6b7280' },
  { stage: 'Members', count: 1250, color: '#3b82f6' },
  { stage: 'Hands Raised', count: 450, color: '#8b5cf6' },
  { stage: 'Qualified', count: 120, color: '#06b6d4' },
  { stage: 'Offers Made', count: 60, color: '#7c3aed' },
  { stage: 'Premium', count: 12, color: '#a855f7' },
  { stage: 'VIP', count: 28, color: '#f59e0b' },
]

const conversionRates = [
  { from: 'About Visits', to: 'Members', rate: 14.7 },
  { from: 'Members', to: 'Hands Raised', rate: 36.0 },
  { from: 'Hands Raised', to: 'Qualified', rate: 26.7 },
  { from: 'Qualified', to: 'Offers Made', rate: 50.0 },
  { from: 'Offers Made', to: 'Premium/VIP', rate: 66.7 },
]

// Stage breakdown data for table view
interface StageBreakdown {
  id: string
  stage: FunnelStage
  stageLabel: string
  count: number
  prevCount: number
  change: number
  conversionRate: number | null
  avgDaysInStage: number
}

const stageBreakdowns: StageBreakdown[] = [
  { id: '1', stage: 'lead', stageLabel: 'Leads', count: 1250, prevCount: 1180, change: 5.9, conversionRate: null, avgDaysInStage: 0 },
  { id: '2', stage: 'hand_raiser', stageLabel: 'Hand Raisers', count: 450, prevCount: 420, change: 7.1, conversionRate: 36.0, avgDaysInStage: 3.2 },
  { id: '3', stage: 'qualified', stageLabel: 'Qualified', count: 180, prevCount: 165, change: 9.1, conversionRate: 40.0, avgDaysInStage: 5.8 },
  { id: '4', stage: 'vip', stageLabel: 'VIP', count: 45, prevCount: 42, change: 7.1, conversionRate: 25.0, avgDaysInStage: 8.4 },
  { id: '5', stage: 'premium', stageLabel: 'Premium', count: 28, prevCount: 25, change: 12.0, conversionRate: 62.2, avgDaysInStage: 12.1 },
  { id: '6', stage: 'funded', stageLabel: 'Funded', count: 12, prevCount: 10, change: 20.0, conversionRate: 42.9, avgDaysInStage: 45.3 },
]

// ContactAtStage type is imported from use-kpi-data

const stageColumns: Column<StageBreakdown>[] = [
  {
    key: 'stageLabel',
    header: 'Stage',
    render: (value) => <span className="font-medium">{value as string}</span>,
  },
  {
    key: 'count',
    header: 'Current',
    align: 'right',
    render: (value) => (value as number).toLocaleString(),
  },
  {
    key: 'change',
    header: 'Change',
    align: 'right',
    render: (value) => {
      const change = value as number
      return (
        <span className={cn(change >= 0 ? 'text-green-600' : 'text-red-500')}>
          {change >= 0 ? '+' : ''}
          {change}%
        </span>
      )
    },
  },
  {
    key: 'conversionRate',
    header: 'Conv. Rate',
    align: 'right',
    render: (value) => (value !== null ? `${value}%` : '-'),
  },
  {
    key: 'avgDaysInStage',
    header: 'Avg Days',
    align: 'right',
    render: (value) => `${(value as number).toFixed(1)}d`,
  },
]

const contactColumns: Column<ContactAtStage>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (value) => <span className="font-medium">{value as string}</span>,
  },
  { key: 'email', header: 'Email' },
  { key: 'source', header: 'Source' },
  {
    key: 'daysInStage',
    header: 'Days in Stage',
    align: 'right',
    render: (value) => `${value}d`,
  },
  { key: 'enteredAt', header: 'Entered', align: 'right' },
]

export default function FunnelPage() {
  // Use persisted filters (shared with Overview page)
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
  const [selectedStage, setSelectedStage] = useState<FunnelStage>('lead')

  // Fetch live KPI data with filters
  const { data: kpiData, isLoading, error } = useKPIOverview({
    dateRange,
    period,
    sources: sources as string[],
  })

  // Fetch contacts at the selected stage
  const {
    data: stageContacts,
    isLoading: isLoadingContacts,
  } = useContactsByStage({
    stage: selectedStage,
    sources: sources as string[],
    dateRange,
    contactsLimit: 50,
    enabled: isLoaded && !isLoading, // Only fetch after main data loads
  })

  // Build funnel flow data from live API using shared utility
  const liveFunnelFlowData: FunnelFlowData = useMemo(() => {
    return buildFunnelFlowData(kpiData, 5720)
  }, [kpiData])

  // Build funnel chart data from live API
  const liveFunnelData = useMemo(() => {
    if (!kpiData?.funnel?.stages) return mockFunnelData
    return kpiData.funnel.stages.map(stage => ({
      stage: stage.name,
      count: stage.count,
      color: stage.color,
    }))
  }, [kpiData])

  // Build stage breakdown from live API
  const liveStageBreakdowns: StageBreakdown[] = useMemo(() => {
    if (!kpiData?.funnel?.stages) return stageBreakdowns // Fallback to mock

    return kpiData.funnel.stages.map((stage, index) => ({
      id: String(index + 1),
      stage: stage.id as FunnelStage,
      stageLabel: stage.name,
      count: stage.count,
      prevCount: 0, // No historical data yet
      change: 0, // No change tracking yet
      conversionRate: stage.conversionRate,
      avgDaysInStage: 0, // No stage duration tracking yet
    }))
  }, [kpiData])

  // Build conversion rates from live API
  const liveConversionRates = useMemo(() => {
    if (!kpiData?.funnel?.stages) return conversionRates // Fallback to mock

    const rates: typeof conversionRates = []
    const stages = kpiData.funnel.stages

    for (let i = 1; i < stages.length; i++) {
      const fromStage = stages[i - 1]
      const toStage = stages[i]
      if (toStage.conversionRate !== null) {
        rates.push({
          from: fromStage.name,
          to: toStage.name,
          rate: toStage.conversionRate,
        })
      }
    }

    return rates
  }, [kpiData])

  if (!isLoaded || isLoading) {
    return (
      <AppShell title="KPI Dashboard" appId="kpi">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="KPI Dashboard" appId="kpi">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive font-medium">Failed to load funnel data</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="KPI Dashboard" appId="kpi">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funnel Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Track conversion rates through each stage of the customer journey
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

        {/* Funnel Flow Visual - Primary visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel Flow</CardTitle>
            <CardDescription>Visual representation of the customer journey</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelFlow data={liveFunnelFlowData} />
          </CardContent>
        </Card>

        {/* Funnel Details */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Funnel Overview</CardTitle>
              <CardDescription>Current distribution across stages</CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelChart data={liveFunnelData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Rates</CardTitle>
              <CardDescription>Stage-to-stage conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveConversionRates.map((conv) => (
                  <div key={`${conv.from}-${conv.to}`} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {conv.from} → {conv.to}
                      </span>
                      <span className="font-medium">{conv.rate}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${conv.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stage Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Breakdown</CardTitle>
            <CardDescription>Detailed metrics for each funnel stage</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={stageColumns}
              data={liveStageBreakdowns}
              keyField="id"
              paginated={false}
            />
          </CardContent>
        </Card>

        {/* Contacts by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts by Stage</CardTitle>
            <CardDescription>View contacts currently at each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStage} onValueChange={(v) => setSelectedStage(v as FunnelStage)}>
              <TabsList className="mb-4">
                <TabsTrigger value="lead">Leads</TabsTrigger>
                <TabsTrigger value="hand_raiser">Hand Raisers</TabsTrigger>
                <TabsTrigger value="qualified">Qualified</TabsTrigger>
                <TabsTrigger value="vip">VIP</TabsTrigger>
                <TabsTrigger value="premium">Premium</TabsTrigger>
                <TabsTrigger value="funded">Funded</TabsTrigger>
              </TabsList>
              {(['lead', 'hand_raiser', 'qualified', 'vip', 'premium', 'funded'] as FunnelStage[]).map(
                (stage) => (
                  <TabsContent key={stage} value={stage}>
                    {isLoadingContacts && selectedStage === stage ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading contacts...</span>
                      </div>
                    ) : (
                      <DataTable
                        columns={contactColumns}
                        data={selectedStage === stage ? (stageContacts || []) : []}
                        keyField="id"
                        pageSize={10}
                        emptyMessage={`No contacts at ${stage.replace('_', ' ')} stage`}
                      />
                    )}
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
