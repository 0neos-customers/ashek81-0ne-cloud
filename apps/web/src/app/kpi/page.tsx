'use client'

import { useMemo } from 'react'
import { cn } from '@0ne/ui'
import { AppShell } from '@/components/shell'
import { MetricCard } from '@/features/kpi/components/MetricCard'
import { FunnelChart } from '@/features/kpi/charts/FunnelChart'
import { TrendChart } from '@/features/kpi/charts/TrendChart'
import { MrrTrendChart } from '@/features/kpi/charts/MrrTrendChart'
import { FilterBar } from '@/features/kpi/components/FilterBar'
import { FunnelFlow, type FunnelFlowData } from '@/features/kpi/components/FunnelFlow'
import { ExpenseCategoryFilter } from '@/features/kpi/components/ExpenseCategoryFilter'
import { AboutPageAnalytics } from '@/features/kpi/components/AboutPageAnalytics'
import { buildFunnelFlowData, SAMPLE_FUNNEL_FLOW_DATA } from '@/features/kpi/lib/funnel-utils'
import { DollarSign, Users, TrendingUp, TrendingDown, Percent, Calculator, Clock, UserPlus, Loader2 } from 'lucide-react'
import { useKPIOverview, useExpensesData, useRevenueData, useUnitEconomics, useRecentActivity } from '@/features/kpi/hooks/use-kpi-data'
import { usePersistedFilters } from '@/features/kpi/hooks/use-persisted-filters'

// Sample data - Row 1: Revenue metrics
const metrics = {
  // Row 1
  revenue: {
    current: 47250,
    change: 12.5,
    trend: 'up' as const,
  },
  expenses: {
    current: 12820,
    change: 5.2,
    trend: 'up' as const,
  },
  mrr: {
    current: 15800,
    change: 8.3,
    trend: 'up' as const,
  },
  churn: {
    current: 4.2,
    change: -1.5,
    trend: 'down' as const, // down is good for churn
  },
  // Row 2
  ltgpCac: {
    current: 3.2,
    change: 0.4,
    trend: 'up' as const,
  },
  cac: {
    current: 143,
    change: -8.5,
    trend: 'down' as const, // down is good for CAC
  },
  grossProfit: {
    current: 34430,
    change: 15.2,
    trend: 'up' as const,
  },
  paybackPeriod: {
    current: 2.8,
    change: -0.3,
    trend: 'down' as const, // down is good for payback
  },
  // Row 3 - Members
  totalMembers: {
    current: 1250,
    change: 8.2,
    trend: 'up' as const,
  },
  freeMembers: {
    current: 1210,
    change: 7.8,
    trend: 'up' as const,
  },
  premiumMembers: {
    current: 12,
    change: 20.0,
    trend: 'up' as const,
  },
  vipMembers: {
    current: 28,
    change: 12.0,
    trend: 'up' as const,
  },
}

// Legacy funnel data for FunnelChart (bar chart)
const funnelData = [
  { stage: 'About Visits', count: 8500, color: '#6b7280' },
  { stage: 'Members', count: 1250, color: '#3b82f6' },
  { stage: 'Hands Raised', count: 450, color: '#8b5cf6' },
  { stage: 'Qualified', count: 120, color: '#06b6d4' },
  { stage: 'Offers Made', count: 60, color: '#7c3aed' },
  { stage: 'Premium', count: 12, color: '#a855f7' },
  { stage: 'VIP', count: 28, color: '#f59e0b' },
]

const trendData = [
  { date: '2026-01-06', leads: 45, handRaisers: 12, clients: 2 },
  { date: '2026-01-13', leads: 52, handRaisers: 15, clients: 3 },
  { date: '2026-01-20', leads: 48, handRaisers: 18, clients: 4 },
  { date: '2026-01-27', leads: 65, handRaisers: 22, clients: 5 },
  { date: '2026-02-03', leads: 72, handRaisers: 28, clients: 6 },
]

const recentActivity = [
  { id: 1, type: 'lead', name: 'Marcus Johnson', source: 'Facebook Ad', time: '2 hours ago' },
  { id: 2, type: 'hand_raiser', name: 'Sarah Chen', source: 'Workshop', time: '4 hours ago' },
  { id: 3, type: 'funded', name: 'Robert Williams', source: 'Referral', time: '6 hours ago', value: 125000 },
  { id: 4, type: 'vip', name: 'Jennifer Lopez', source: 'Facebook Ad', time: 'Yesterday', value: 997 },
  { id: 5, type: 'lead', name: 'David Kim', source: 'Google Ad', time: 'Yesterday' },
]

// Stage colors matching config.ts STAGE_COLORS
const typeColors: Record<string, string> = {
  member: 'bg-slate-100 text-slate-700',
  hand_raiser: 'bg-blue-100 text-blue-700',
  qualified_premium: 'bg-pink-100 text-pink-700',
  qualified_vip: 'bg-violet-100 text-violet-700',
  offer_made_premium: 'bg-pink-100 text-pink-700',
  offer_made_vip: 'bg-violet-100 text-violet-700',
  offer_seen: 'bg-orange-100 text-orange-700',
  vip: 'bg-orange-100 text-orange-700',
  premium: 'bg-green-100 text-green-700',
  // Legacy mappings for sample data
  lead: 'bg-blue-100 text-blue-700',
  qualified: 'bg-cyan-100 text-cyan-700',
  funded: 'bg-emerald-100 text-emerald-700',
}

// Stage labels matching config.ts STAGE_LABELS
const typeLabels: Record<string, string> = {
  member: 'Member',
  hand_raiser: 'Hand Raiser',
  qualified_premium: 'Qualified (Premium)',
  qualified_vip: 'Qualified (VIP)',
  offer_made_premium: 'Offer Made (Premium)',
  offer_made_vip: 'Offer Made (VIP)',
  offer_seen: 'Offer Seen',
  vip: 'VIP',
  premium: 'Premium',
  // Legacy mappings for sample data
  lead: 'Lead',
  qualified: 'Qualified',
  funded: 'Funded',
}

export default function KPIDashboardPage() {
  // Use persisted filters (saved to localStorage)
  const {
    period,
    dateRange,
    sources,
    selectedExpenses,
    isLoaded,
    hasActiveFilters,
    setPeriod,
    setDateRange,
    setSources,
    setSelectedExpenses,
    resetFilters,
  } = usePersistedFilters()

  // Fetch live KPI data with the selected filters
  const { data: kpiData, isLoading, error } = useKPIOverview({
    dateRange,
    period,
    sources: sources as string[],
  })

  // Fetch live expenses data with date filtering
  const { data: expensesData, isLoading: isExpensesLoading } = useExpensesData({
    dateRange,
    period,
  })

  // Fetch live revenue data with date filtering
  const { data: revenueData, isLoading: isRevenueLoading } = useRevenueData({
    dateRange,
    period,
  })

  // Fetch unit economics data (LTV, EPL, ARPU)
  const { data: unitEconomicsData, isLoading: isUnitEconomicsLoading } = useUnitEconomics({
    dateRange,
    period,
  })

  // Fetch recent activity data
  const { data: recentActivityData, isLoading: isRecentActivityLoading } = useRecentActivity({
    limit: 10,
  })

  // Build expense categories from API data
  const expenseCategories = useMemo(() => {
    if (!expensesData?.categories) return {}
    const categories: Record<string, { name: string; amount: number; color?: string }> = {}
    expensesData.categories.forEach((cat) => {
      const key = cat.id.toLowerCase().replace(/\s+/g, '_')
      categories[key] = { name: cat.name, amount: cat.amount, color: cat.color }
    })
    return categories
  }, [expensesData])

  // Calculate total expenses based on selection (from live data)
  const totalExpenses = useMemo(() => {
    // If no expenses selected, use the sum from API
    if (selectedExpenses.length === 0) {
      return expensesData?.summary?.totalExpenses || 0
    }
    // Otherwise, sum selected categories
    return selectedExpenses.reduce((sum, key) => {
      return sum + (expenseCategories[key]?.amount || 0)
    }, 0)
  }, [selectedExpenses, expenseCategories, expensesData])

  // Build funnel flow data from live API data using shared utility
  const funnelDataWithExpenses: FunnelFlowData = useMemo(() => {
    return buildFunnelFlowData(kpiData, totalExpenses)
  }, [kpiData, totalExpenses])

  // Build funnel chart data from live API
  const liveFunnelData = useMemo(() => {
    if (!kpiData?.funnel?.stages) return funnelData
    return kpiData.funnel.stages.map(stage => ({
      stage: stage.name,
      count: stage.count,
      color: stage.color,
    }))
  }, [kpiData])

  // Build metrics from live API data
  // Use Skool as source of truth for member counts
  const liveMetrics = useMemo(() => {
    if (!kpiData?.funnel?.stages) return metrics
    const stages = kpiData.funnel.stages
    const getStageCount = (id: string) => stages.find(s => s.id === id)?.count || 0

    // Use Skool totalMembers for the card (cumulative count at end of period)
    const totalMembersCount = kpiData.skool?.totalMembers || getStageCount('member')
    const premiumCount = getStageCount('premium')
    const vipCount = getStageCount('vip')
    const totalClients = premiumCount + vipCount

    // Calculate CAC from expenses data
    const totalAdSpend = expensesData?.summary?.totalAdSpend || 0
    const cac = totalClients > 0 ? Math.round(totalAdSpend / totalClients) : 0

    // Calculate Gross Profit (revenue - expenses)
    const totalExpensesAmount = expensesData?.summary?.totalExpenses || 0
    const totalRevenue = revenueData?.total?.current || 0
    const grossProfit = totalRevenue - totalExpensesAmount

    // Calculate member change based on API data
    const totalMembersChange = kpiData.skool?.totalMembersChange || 0
    const newMembersChange = kpiData.skool?.newMembersChange || 0

    return {
      ...metrics,
      totalMembers: {
        current: totalMembersCount,
        change: totalMembersChange,
        trend: totalMembersChange > 0 ? 'up' as const : totalMembersChange < 0 ? 'down' as const : 'neutral' as const,
      },
      freeMembers: {
        current: totalMembersCount - premiumCount - vipCount,
        change: totalMembersChange, // Use same change as total for now
        trend: totalMembersChange > 0 ? 'up' as const : totalMembersChange < 0 ? 'down' as const : 'neutral' as const,
      },
      premiumMembers: {
        current: premiumCount,
        change: 0, // Premium/VIP changes would need separate tracking
        trend: 'neutral' as const,
      },
      vipMembers: {
        current: vipCount,
        change: 0, // Premium/VIP changes would need separate tracking
        trend: 'neutral' as const,
      },
      cac: { current: cac, change: 0, trend: 'neutral' as const },
      grossProfit: { current: grossProfit, change: 0, trend: grossProfit > 0 ? 'up' as const : 'down' as const },
    }
  }, [kpiData, expensesData])

  if (!isLoaded || isLoading || isExpensesLoading || isRevenueLoading || isUnitEconomicsLoading) {
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
            <p className="text-destructive font-medium">Failed to load dashboard data</p>
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
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track your business performance and funnel metrics
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
        >
          <ExpenseCategoryFilter
            categories={(expensesData?.categories || []).map((cat) => ({
              id: cat.id,
              name: cat.name,
              amount: cat.amount,
            }))}
            selected={selectedExpenses}
            onSelectionChange={setSelectedExpenses}
          />
        </FilterBar>

        {/* Metric Cards - Row 1: Revenue Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Revenue"
            value={`$${(revenueData?.total?.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change={revenueData?.total?.change || 0}
            trend={revenueData?.total?.change && revenueData.total.change > 0 ? 'up' : revenueData?.total?.change && revenueData.total.change < 0 ? 'down' : 'neutral'}
            icon={DollarSign}
            description="One Time + MRR"
          />
          <MetricCard
            title="One Time"
            value={`$${(revenueData?.oneTime?.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change={revenueData?.oneTime?.change || 0}
            trend="neutral"
            icon={DollarSign}
            description={revenueData?.oneTime?.note || 'GHL payments'}
          />
          <MetricCard
            title="MRR"
            value={`$${(revenueData?.recurring?.current || kpiData?.skool?.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change={revenueData?.recurring?.change || 0}
            trend={revenueData?.recurring?.change && revenueData.recurring.change > 0 ? 'up' : 'neutral'}
            icon={TrendingUp}
            description={`${revenueData?.recurring?.payingMembers || kpiData?.skool?.paidMembers || 0} paying @ ${revenueData?.recurring?.retention || kpiData?.skool?.mrrRetention || 0}% retention`}
          />
          <MetricCard
            title="Expenses"
            value={`$${totalExpenses.toLocaleString()}`}
            change={0}
            trend="neutral"
            positiveIsGood={false}
            icon={TrendingDown}
            description={selectedExpenses.length === 0 ? `${expensesData?.categories?.length || 0} categories` : `${selectedExpenses.length} of ${expensesData?.categories?.length || 0} selected`}
          />
        </div>

        {/* Metric Cards - Row 2: Unit Economics (LIVE DATA) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="LTV:CAC"
            value={`${(unitEconomicsData?.ltvCacRatio || 0).toFixed(1)}x`}
            change={0}
            trend={(unitEconomicsData?.ltvCacRatio || 0) >= 3 ? 'up' : (unitEconomicsData?.ltvCacRatio || 0) >= 1 ? 'neutral' : 'down'}
            icon={Calculator}
            description={`$${(unitEconomicsData?.ltv || 0).toFixed(0)} LTV ÷ $${(unitEconomicsData?.cac || 0).toFixed(0)} CAC`}
          />
          <MetricCard
            title="CAC"
            value={`$${(unitEconomicsData?.cac || liveMetrics.cac.current).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            change={0}
            trend="neutral"
            positiveIsGood={false}
            icon={UserPlus}
            description="Ad spend ÷ clients"
          />
          <MetricCard
            title="Gross Profit"
            value={`$${liveMetrics.grossProfit.current.toLocaleString()}`}
            change={liveMetrics.grossProfit.change}
            trend={liveMetrics.grossProfit.trend}
            icon={DollarSign}
            description="Revenue - expenses"
          />
          <MetricCard
            title="Payback Period"
            value={`${(unitEconomicsData?.paybackPeriod || 0).toFixed(1)} mo`}
            change={0}
            trend={(unitEconomicsData?.paybackPeriod || 0) <= 3 ? 'up' : (unitEconomicsData?.paybackPeriod || 0) <= 6 ? 'neutral' : 'down'}
            positiveIsGood={false}
            icon={Clock}
            description={`$${(unitEconomicsData?.cac || 0).toFixed(0)} CAC ÷ $${(unitEconomicsData?.arpu || 0).toFixed(0)}/mo ARPU`}
          />
        </div>

        {/* Metric Cards - Row 3: Members (LIVE DATA) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Members"
            value={liveMetrics.totalMembers.current.toLocaleString()}
            change={liveMetrics.totalMembers.change}
            trend={liveMetrics.totalMembers.trend}
            icon={Users}
          />
          <MetricCard
            title="Free"
            value={liveMetrics.freeMembers.current.toLocaleString()}
            change={liveMetrics.freeMembers.change}
            trend={liveMetrics.freeMembers.trend}
            icon={Users}
          />
          <MetricCard
            title="Premium"
            value={liveMetrics.premiumMembers.current.toString()}
            change={liveMetrics.premiumMembers.change}
            trend={liveMetrics.premiumMembers.trend}
            icon={Users}
          />
          <MetricCard
            title="VIP"
            value={liveMetrics.vipMembers.current.toString()}
            change={liveMetrics.vipMembers.change}
            trend={liveMetrics.vipMembers.trend}
            icon={Users}
          />
        </div>

        {/* Funnel Flow Visual */}
        <div className={cn(
          'rounded-lg border border-border bg-card p-5',
          'shadow-[0_1px_2px_rgba(34,32,29,0.05)]'
        )}>
          <div className="mb-4">
            <h2 className="text-base font-semibold">Funnel Flow</h2>
            <p className="text-sm text-muted-foreground">
              Visual flow from ad visit to client • Cost based on ${totalExpenses.toLocaleString()} selected expenses
            </p>
          </div>
          <FunnelFlow data={funnelDataWithExpenses} />
        </div>

        {/* About Page Analytics */}
        <AboutPageAnalytics dateRange={dateRange} />

        {/* EPL & LTV Cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* EPL Card */}
          <div className={cn(
            'rounded-lg border border-border bg-card p-6',
            'shadow-[0_1px_2px_rgba(34,32,29,0.05)]'
          )}>
            <div className="text-sm font-medium text-muted-foreground mb-4">EPL</div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                ${(unitEconomicsData?.epl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground mb-6">
                Average Earnings Per Member
                {unitEconomicsData?.totalMembers && (
                  <span className="block text-xs mt-1">
                    ${(unitEconomicsData.totalRevenue || 0).toLocaleString()} ÷ {unitEconomicsData.totalMembers.toLocaleString()} members
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {(unitEconomicsData?.eplByCohort || []).map((item, index) => (
                  <div
                    key={item.day}
                    className={cn(
                      'text-sm',
                      index % 2 === 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    DAY {item.day} - ${item.value.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LTV Card */}
          <div className={cn(
            'rounded-lg border border-border bg-card p-6',
            'shadow-[0_1px_2px_rgba(34,32,29,0.05)]'
          )}>
            <div className="text-sm font-medium text-muted-foreground mb-4">LTV</div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                ${(unitEconomicsData?.ltv || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground mb-6">
                Average Lifetime Value
                {unitEconomicsData?.arpu && unitEconomicsData?.avgLifetimeMonths && (
                  <span className="block text-xs mt-1">
                    ${unitEconomicsData.arpu.toFixed(2)} ARPU × {unitEconomicsData.avgLifetimeMonths.toFixed(0)} mo avg lifetime
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {(unitEconomicsData?.ltvByCohort || []).map((item, index) => (
                  <div
                    key={item.day}
                    className={cn(
                      'text-sm',
                      index % 2 === 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    DAY {item.day} - ${item.value.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Funnel Chart Card (LIVE DATA) */}
          <div className={cn(
            'rounded-lg border border-border bg-card p-5',
            'shadow-[0_1px_2px_rgba(34,32,29,0.05)]'
          )}>
            <div className="mb-4">
              <h2 className="text-base font-semibold">Funnel Overview</h2>
              <p className="text-sm text-muted-foreground">Current stage distribution</p>
            </div>
            <FunnelChart data={liveFunnelData} />
          </div>

          {/* Trend Chart Card */}
          <div className={cn(
            'rounded-lg border border-border bg-card p-5',
            'shadow-[0_1px_2px_rgba(34,32,29,0.05)]'
          )}>
            <div className="mb-4">
              <h2 className="text-base font-semibold">Weekly Trends</h2>
              <p className="text-sm text-muted-foreground">Lead and client acquisition over time</p>
            </div>
            <TrendChart data={kpiData?.trends?.weekly || trendData} />
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className={cn(
          'rounded-lg border border-border bg-card p-5',
          'shadow-[0_1px_2px_rgba(34,32,29,0.05)]'
        )}>
          <div className="mb-4">
            <h2 className="text-base font-semibold">Revenue Trend</h2>
            <p className="text-sm text-muted-foreground">
              Monthly recurring (Skool) + one-time (GHL) revenue
            </p>
          </div>
          <MrrTrendChart data={revenueData?.monthly || []} height={300} />
        </div>

        {/* Recent Activity */}
        <div className={cn(
          'rounded-lg border border-border bg-card p-5',
          'shadow-[0_1px_2px_rgba(34,32,29,0.05)]'
        )}>
          <div className="mb-4">
            <h2 className="text-base font-semibold">Recent Activity</h2>
            <p className="text-sm text-muted-foreground">Latest funnel movements</p>
          </div>
          {isRecentActivityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentActivityData && recentActivityData.length > 0 ? (
            <div className="divide-y divide-border">
              {recentActivityData.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      typeColors[activity.stage] || 'bg-gray-100 text-gray-700'
                    )}>
                      {typeLabels[activity.stage] || activity.stage}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{activity.name}</p>
                      <p className="text-xs text-muted-foreground">{activity.source || 'Unknown source'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No recent activity found
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
