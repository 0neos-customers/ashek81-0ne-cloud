'use client'

import { useState } from 'react'
import { AppShell } from '@/components/shell'
import { MetricCard } from '@/features/kpi/components/MetricCard'
import { FilterBar } from '@/features/kpi/components/FilterBar'
import { TransactionsTable } from '@/features/kpi/components/TransactionsTable'
import { useGhlData, useGhlTransactions, type TransactionType } from '@/features/kpi/hooks/use-ghl-data'
import { usePersistedFilters } from '@/features/kpi/hooks/use-persisted-filters'
import { FunnelChart, type FunnelDataPoint, RevenueTrendChart } from '@/features/kpi/charts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@0ne/ui'
import {
  DollarSign,
  Receipt,
  Percent,
  Calculator,
  Loader2,
  Users,
  UserPlus,
  Hand,
  Crown,
} from 'lucide-react'

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function GhlKpiPage() {
  // Use persisted filters (shared across all KPI pages)
  const {
    period,
    dateRange,
    isLoaded,
    hasActiveFilters,
    setPeriod,
    setDateRange,
    resetFilters,
  } = usePersistedFilters()

  // Transactions filter state
  const [transactionType, setTransactionType] = useState<TransactionType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { data, isLoading, error } = useGhlData({ dateRange, period })

  // Fetch transactions with current filters
  const {
    transactions,
    total: transactionsTotal,
    isLoading: transactionsLoading,
  } = useGhlTransactions({
    dateRange,
    period,
    transactionType,
    search: searchTerm,
    limit,
    offset,
  })

  // Reset pagination when filters change
  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type)
    setOffset(0)
  }

  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    setOffset(0)
  }

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset)
  }

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
            <p className="text-destructive font-medium">Failed to load GHL metrics</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="KPI Dashboard" appId="kpi">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">GoHighLevel</h1>
            <p className="text-sm text-muted-foreground">
              Revenue metrics from GHL payment transactions
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onPeriodChange={setPeriod}
          period={period}
          showSourceFilter={false}
          showCampaignFilter={false}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        {/* Revenue Cards Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={data ? formatCurrency(data.totalRevenue.current) : '—'}
            change={data?.totalRevenue.change}
            trend={data?.totalRevenue.trend}
            icon={DollarSign}
            description={data ? `${data.transactionCount.current} transactions` : undefined}
          />
          <MetricCard
            title="Setup Fees"
            value={data ? formatCurrency(data.setupFees.current) : '—'}
            change={data?.setupFees.change}
            trend={data?.setupFees.trend}
            icon={Receipt}
            description="PREIFM (one-time)"
          />
          <MetricCard
            title="Funding Fees"
            value={data ? formatCurrency(data.fundingFees.current) : '—'}
            change={data?.fundingFees.change}
            trend={data?.fundingFees.trend}
            icon={Percent}
            description="7% success fees"
          />
          <MetricCard
            title="Avg Transaction"
            value={data ? formatCurrency(data.avgTransaction.current) : '—'}
            change={data?.avgTransaction.change}
            trend={data?.avgTransaction.trend}
            icon={Calculator}
          />
        </div>

        {/* Contacts Cards Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Contacts"
            value={data ? data.totalContacts.current.toLocaleString() : '—'}
            icon={Users}
            description="All synced contacts with funnel tags"
          />
          <MetricCard
            title="New Contacts"
            value={data ? data.newContacts.current.toLocaleString() : '—'}
            change={data?.newContacts.change}
            trend={data?.newContacts.trend}
            icon={UserPlus}
            description="Created in selected period"
          />
          <MetricCard
            title="Hand Raisers"
            value={data ? data.handRaisers.current.toLocaleString() : '—'}
            icon={Hand}
            description="Showed interest"
          />
          <MetricCard
            title="Clients"
            value={data ? data.clients.current.toLocaleString() : '—'}
            icon={Crown}
            description="Premium + VIP"
          />
        </div>

        {/* Funnel Stage Distribution Chart */}
        {data && data.stageDistribution && data.stageDistribution.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Funnel Stage Distribution</h3>
            <FunnelChart
              data={data.stageDistribution.map((item): FunnelDataPoint => ({
                stage: item.label,
                count: item.count,
                color: item.color,
              }))}
            />
          </div>
        )}

        {/* Revenue Trend Chart */}
        {data && data.revenueTrend && data.revenueTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Setup fees and funding fees over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart data={data.revenueTrend} />
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              All payment transactions in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionsTable
              transactions={transactions}
              total={transactionsTotal}
              limit={limit}
              offset={offset}
              isLoading={transactionsLoading}
              onPageChange={handlePageChange}
              onTypeChange={handleTypeChange}
              onSearchChange={handleSearchChange}
              currentType={transactionType}
              currentSearch={searchTerm}
            />
          </CardContent>
        </Card>

        {/* Period Summary */}
        {data && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing data from {data.period.startDate} to {data.period.endDate}
              </span>
              <span className="text-muted-foreground">
                {data.transactionCount.current} succeeded transactions
              </span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
