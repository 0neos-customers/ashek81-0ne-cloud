/**
 * KPI Dataset Types
 *
 * Types for the unified /api/kpi/dataset endpoint response
 * Used for client-side filtering and caching
 */

import type { FunnelStage } from './config'

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

export interface DailyAggregate {
  id: string
  date: string
  campaignId: string | null
  source: string | null
  newLeads: number
  newHandRaisers: number
  newQualified: number
  newVip: number
  newPremium: number
  newFunded: number
  totalRevenue: number
  vipRevenue: number
  premiumRevenue: number
  successFeeRevenue: number
  adSpend: number
  expenses: number
  totalFundedAmount: number
  fundedCount: number
}

export interface AggregatedTotals {
  newMembers: number
  newHandRaisers: number
  newQualifiedPremium: number
  newQualifiedVip: number
  newOfferMade: number
  newOfferSeen: number
  newVip: number
  newPremium: number
  newClients: number
  totalRevenue: number
  vipRevenue: number
  premiumRevenue: number
  successFeeRevenue: number
  adSpend: number
  expenses: number
  totalFundedAmount: number
  fundedCount: number
}

// =============================================================================
// DIMENSION TYPES
// =============================================================================

export interface DimensionSource {
  source: string
  displayName: string
  contactCount: number
  lastSeenDate: string | null
  isActive: boolean
}

export interface DimensionStage {
  stage: string
  displayName: string
  color: string
  sortOrder: number
  contactCount: number
}

export interface DimensionCampaign {
  campaignId: string
  campaignName: string
  contactCount: number
  isActive: boolean
}

export interface DimensionExpenseCategory {
  category: string
  displayName: string | null
  color: string | null
  expenseCount: number
  totalAmount: number
  isSystem: boolean
}

// =============================================================================
// TREND TYPES
// =============================================================================

export interface WeeklyTrend {
  weekStart: string
  weekNumber: string
  source: string | null
  campaignId: string | null
  newLeads: number
  newHandRaisers: number
  newQualified: number
  newClients: number
  totalRevenue: number
  adSpend: number
  costPerLead: number | null
  costPerClient: number | null
}

export interface DailyExpenseByCategory {
  date: string
  category: string
  amount: number
  isSystem: boolean
  expenseCount: number
}

// =============================================================================
// FUNNEL TYPES
// =============================================================================

export interface FunnelStageData {
  id: FunnelStage
  name: string
  color: string
  count: number
  conversionRate?: number | null
}

// =============================================================================
// SKOOL TYPES
// =============================================================================

export interface SkoolDataset {
  totalMembers: number
  activeMembers: number
  communityActivity: number
  categoryRank: number | null
  category: string | null
  aboutPageVisits: number
  conversionRate: number
  snapshotDate: string
  mrr: number
  mrrRetention: number
  paidMembers: number
}

// =============================================================================
// DATASET RESPONSE TYPE
// =============================================================================

export interface KPIDataset {
  aggregates: {
    daily: DailyAggregate[]
    bySource: Record<string, DailyAggregate[]>
    byCampaign: Record<string, DailyAggregate[]>
    all: DailyAggregate[]
  }
  dimensions: {
    sources: DimensionSource[]
    stages: DimensionStage[]
    campaigns: DimensionCampaign[]
    expenseCategories: DimensionExpenseCategory[]
  }
  funnel: {
    stages: FunnelStageData[]
    totalContacts: number
    overallConversion: number
  }
  weeklyTrends: {
    overall: WeeklyTrend[]
    bySource: Record<string, WeeklyTrend[]>
  }
  expenses: {
    byCategory: Record<string, DailyExpenseByCategory[]>
    dailyTotal: { date: string; amount: number }[]
    categories: DimensionExpenseCategory[]
  }
  skool: SkoolDataset | null
  meta: {
    generatedAt: string
    periodStart: string
    periodEnd: string
    daysIncluded: number
    aggregateCount: number
    contactCount: number
  }
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface KPIFilters {
  dateRange: {
    startDate: string
    endDate: string
  }
  sources: string[]
  campaigns: string[]
  expenseCategories: string[]
}

// =============================================================================
// DERIVED METRICS TYPES
// =============================================================================

export interface DerivedMetrics {
  current: AggregatedTotals
  previous: AggregatedTotals
  changes: {
    revenue: { value: number; change: number; trend: 'up' | 'down' | 'neutral' }
    leads: { value: number; change: number; trend: 'up' | 'down' | 'neutral' }
    clients: { value: number; change: number; trend: 'up' | 'down' | 'neutral' }
    fundedAmount: { value: number; change: number; trend: 'up' | 'down' | 'neutral' }
    costPerLead: { value: number; change: number; trend: 'up' | 'down' | 'neutral' }
    costPerClient: { value: number; change: number; trend: 'up' | 'down' | 'neutral' }
  }
  sparklines: {
    revenue: number[]
    leads: number[]
    clients: number[]
    fundedAmount: number[]
    costPerLead: number[]
    costPerClient: number[]
  }
}
