'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@0ne/ui'
import { AppShell } from '@/components/shell'
import { FilterBar } from '@/features/kpi/components/FilterBar'
import { MetricCard } from '@/features/kpi/components/MetricCard'
import { TrendChart } from '@/features/kpi/charts/TrendChart'
import { MultiSelectFilter } from '@/features/kpi/components/MultiSelectFilter'
import { useFacebookAdsKpi } from '@/features/kpi/hooks/use-kpi-data'
import { usePersistedFilters } from '@/features/kpi/hooks/use-persisted-filters'
import {
  DollarSign,
  Eye,
  ClipboardCheck,
  Calculator,
  MousePointerClick,
  Activity,
  BarChart2,
  TrendingUp,
  Target,
  Users,
  Percent,
} from 'lucide-react'

function formatNumber(value: number) {
  return value.toLocaleString()
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

export default function FacebookAdsKpiPage() {
  const {
    period,
    dateRange,
    isLoaded,
    hasActiveFilters,
    setPeriod,
    setDateRange,
    resetFilters,
  } = usePersistedFilters()

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([])
  const [selectedAds, setSelectedAds] = useState<string[]>([])
  const [campaignFilterIds, setCampaignFilterIds] = useState<string[]>([])
  const [adSetFilterIds, setAdSetFilterIds] = useState<string[]>([])
  const [adFilterIds, setAdFilterIds] = useState<string[]>([])
  const campaignsInitialized = useRef(false)
  const adSetsInitialized = useRef(false)
  const adsInitialized = useRef(false)

  const { data, isLoading, error } = useFacebookAdsKpi({
    dateRange,
    period,
    campaigns: campaignFilterIds,
    adsets: adSetFilterIds,
    ads: adFilterIds,
  })

  const campaigns = data?.filters.campaigns || []
  const adSets = data?.filters.adSets || []
  const ads = data?.filters.ads || []

  const campaignIds = useMemo(() => campaigns.map((c) => c.id), [campaigns])
  const adSetIds = useMemo(() => adSets.map((a) => a.id), [adSets])
  const adIds = useMemo(() => ads.map((a) => a.id), [ads])

  useEffect(() => {
    if (campaignIds.length === 0) return
    setSelectedCampaigns((prev) => {
      const filtered = prev.filter((id) => campaignIds.includes(id))
      if (!campaignsInitialized.current) {
        campaignsInitialized.current = true
        return campaignIds
      }
      return filtered.length > 0 || prev.length === 0 ? filtered : prev
    })
  }, [campaignIds])

  useEffect(() => {
    if (adSetIds.length === 0) return
    setSelectedAdSets((prev) => {
      const filtered = prev.filter((id) => adSetIds.includes(id))
      if (!adSetsInitialized.current) {
        adSetsInitialized.current = true
        return adSetIds
      }
      return filtered.length > 0 || prev.length === 0 ? filtered : prev
    })
  }, [adSetIds])

  useEffect(() => {
    if (adIds.length === 0) return
    setSelectedAds((prev) => {
      const filtered = prev.filter((id) => adIds.includes(id))
      if (!adsInitialized.current) {
        adsInitialized.current = true
        return adIds
      }
      return filtered.length > 0 || prev.length === 0 ? filtered : prev
    })
  }, [adIds])

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false
    const aSorted = [...a].sort()
    const bSorted = [...b].sort()
    return aSorted.every((value, index) => value === bSorted[index])
  }

  useEffect(() => {
    if (campaignIds.length === 0) return
    const next = selectedCampaigns.length === 0 || selectedCampaigns.length === campaignIds.length
      ? []
      : selectedCampaigns
    setCampaignFilterIds((prev) => arraysEqual(prev, next) ? prev : next)
  }, [selectedCampaigns, campaignIds])

  useEffect(() => {
    if (adSetIds.length === 0) return
    const next = selectedAdSets.length === 0 || selectedAdSets.length === adSetIds.length
      ? []
      : selectedAdSets
    setAdSetFilterIds((prev) => arraysEqual(prev, next) ? prev : next)
  }, [selectedAdSets, adSetIds])

  useEffect(() => {
    if (adIds.length === 0) return
    const next = selectedAds.length === 0 || selectedAds.length === adIds.length
      ? []
      : selectedAds
    setAdFilterIds((prev) => arraysEqual(prev, next) ? prev : next)
  }, [selectedAds, adIds])

  const multiFiltersActive = (campaignsInitialized.current && selectedCampaigns.length !== campaignIds.length) ||
    (adSetsInitialized.current && selectedAdSets.length !== adSetIds.length) ||
    (adsInitialized.current && selectedAds.length !== adIds.length)

  const handleReset = () => {
    resetFilters()
    if (campaignIds.length > 0) {
      campaignsInitialized.current = true
      setSelectedCampaigns(campaignIds)
    }
    if (adSetIds.length > 0) {
      adSetsInitialized.current = true
      setSelectedAdSets(adSetIds)
    }
    if (adIds.length > 0) {
      adsInitialized.current = true
      setSelectedAds(adIds)
    }
  }

  const summary = data?.summary

  const dailySeries = useMemo(() => data?.daily || [], [data?.daily])

  if (!isLoaded || isLoading) {
    return (
      <AppShell title="KPI Dashboard" appId="kpi">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-sm text-muted-foreground">Loading Facebook Ads KPIs...</div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="KPI Dashboard" appId="kpi">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive font-medium">Failed to load Facebook Ads KPIs</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="KPI Dashboard" appId="kpi">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facebook Ads</h1>
          <p className="text-sm text-muted-foreground">
            Meta performance metrics synced to the selected date range
          </p>
        </div>

        <FilterBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onPeriodChange={setPeriod}
          period={period}
          showSourceFilter={false}
          showCampaignFilter={false}
          hasActiveFilters={hasActiveFilters || multiFiltersActive}
          onReset={handleReset}
        >
          <MultiSelectFilter
            label="Campaigns"
            items={campaigns}
            selected={selectedCampaigns}
            onSelectionChange={setSelectedCampaigns}
            disabled={campaigns.length === 0}
          />
          <MultiSelectFilter
            label="Ad Sets"
            items={adSets}
            selected={selectedAdSets}
            onSelectionChange={setSelectedAdSets}
            disabled={adSets.length === 0}
          />
          <MultiSelectFilter
            label="Ads"
            items={ads}
            selected={selectedAds}
            onSelectionChange={setSelectedAds}
            disabled={ads.length === 0}
          />
        </FilterBar>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Amount Spent"
            value={summary ? formatCurrency(summary.amountSpent) : '—'}
            icon={DollarSign}
          />
          <MetricCard
            title="Landing Page Views"
            value={summary ? formatNumber(summary.landingPageViews) : '—'}
            icon={Eye}
          />
          <MetricCard
            title="Completed Registrations"
            value={summary ? formatNumber(summary.completedRegistrations) : '—'}
            icon={ClipboardCheck}
          />
          <MetricCard
            title="Cost Per Completed Registration"
            value={summary ? formatCurrency(summary.costPerCompletedRegistration) : '—'}
            icon={Calculator}
            positiveIsGood={false}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="CPC"
            value={summary ? formatCurrency(summary.cpc) : '—'}
            icon={MousePointerClick}
            positiveIsGood={false}
          />
          <MetricCard
            title="CTR"
            value={summary ? formatPercent(summary.ctr) : '—'}
            icon={Percent}
          />
          <MetricCard
            title="CPM"
            value={summary ? formatCurrency(summary.cpm) : '—'}
            icon={BarChart2}
            positiveIsGood={false}
          />
          <MetricCard
            title="Frequency"
            value={summary ? summary.frequency.toFixed(2) : '—'}
            icon={Activity}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Impressions"
            value={summary ? formatNumber(summary.impressions) : '—'}
            icon={TrendingUp}
          />
          <MetricCard
            title="Clicks"
            value={summary ? formatNumber(summary.clicks) : '—'}
            icon={MousePointerClick}
          />
          <MetricCard
            title="Link Clicks"
            value={summary ? formatNumber(summary.linkClicks) : '—'}
            icon={MousePointerClick}
          />
          <MetricCard
            title="Reach"
            value={summary ? formatNumber(summary.reach) : '—'}
            icon={Users}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Unique Clicks"
            value={summary ? formatNumber(summary.uniqueClicks) : '—'}
            icon={MousePointerClick}
          />
          <MetricCard
            title="Conversions"
            value={summary ? formatNumber(summary.conversions) : '—'}
            icon={Target}
          />
          <MetricCard
            title="Cost Per Conversion"
            value={summary ? formatCurrency(summary.costPerConversion) : '—'}
            icon={Calculator}
            positiveIsGood={false}
          />
          <MetricCard
            title="ROAS"
            value={summary ? summary.roas.toFixed(2) : '—'}
            icon={TrendingUp}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Amount Spent (Daily)</CardTitle>
              <CardDescription>Daily spend across selected ads</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={dailySeries}
                lines={[{ key: 'spend', color: '#ef4444', label: 'Spend' }]}
                formatValue={(value) => `$${value.toFixed(0)}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Landing Page Views (Daily)</CardTitle>
              <CardDescription>Traffic reaching landing pages</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={dailySeries}
                lines={[{ key: 'landingPageViews', color: '#6366f1', label: 'LP Views' }]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Completed Registrations (Daily)</CardTitle>
              <CardDescription>Meta-reported completed registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={dailySeries}
                lines={[{ key: 'completedRegistrations', color: '#22c55e', label: 'Completed' }]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Per Completed Registration (Daily)</CardTitle>
              <CardDescription>Daily cost efficiency for completions</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={dailySeries}
                lines={[{ key: 'costPerCompletedRegistration', color: '#f59e0b', label: 'Cost/CR' }]}
                formatValue={(value) => `$${value.toFixed(0)}`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
