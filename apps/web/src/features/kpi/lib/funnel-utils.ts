/**
 * Shared utilities for building funnel flow data
 *
 * This ensures consistency between Overview and Funnel pages
 * when constructing funnel data from API responses.
 */

import type { FunnelFlowData, FunnelStage } from '../components/FunnelFlow'
import type { KPIOverviewData } from '../hooks/use-kpi-data'

/**
 * Sample fallback funnel data (colors match config.ts STAGE_COLORS)
 */
export const SAMPLE_FUNNEL_FLOW_DATA: Omit<FunnelFlowData, 'totalExpenses'> = {
  linearStages: [
    { id: 'visits', label: 'About Visits', count: 8500, color: '#6b7280' },
    { id: 'members', label: 'Members', count: 1250, color: '#94a3b8' }, // slate-400
    { id: 'handsRaised', label: 'Hands Raised', count: 450, color: '#60a5fa' }, // blue-400
  ],
  premiumPath: [
    { id: 'premiumQualified', label: 'Qualified', count: 35, color: '#f472b6' }, // pink-400
    { id: 'premiumOffers', label: 'Offers Made', count: 6, color: '#ec4899' }, // pink-500
    { id: 'premium', label: 'Premium', count: 12, color: '#22c55e' }, // green-500
  ],
  vipPath: [
    { id: 'vipQualified', label: 'Qualified', count: 85, color: '#a78bfa' }, // violet-400
    { id: 'vipOffers', label: 'Offers Made', count: 1, color: '#8b5cf6' }, // violet-500
    { id: 'vip', label: 'VIP', count: 28, color: '#FF692D' }, // primary orange
  ],
}

/**
 * Build funnel flow data from KPI API response
 *
 * Uses Skool as source of truth for About Visits and Members.
 * Uses GHL contact stages for hand_raiser through client tiers.
 *
 * @param kpiData - The KPI overview API response
 * @param totalExpenses - Total expenses for cost-per calculations (optional)
 * @returns FunnelFlowData ready for the FunnelFlow component
 */
export function buildFunnelFlowData(
  kpiData: KPIOverviewData | null | undefined,
  totalExpenses: number = 0
): FunnelFlowData {
  if (!kpiData?.funnel?.stages) {
    return { ...SAMPLE_FUNNEL_FLOW_DATA, totalExpenses }
  }

  const stages = kpiData.funnel.stages
  const getStageCount = (id: string) => stages.find(s => s.id === id)?.count || 0

  // Use Skool metrics for About Visits and Members (source of truth)
  // members is date-filtered from skool_members_daily table
  const skoolMembers = kpiData.skool?.members || 0
  const skoolAboutVisits = kpiData.skool?.aboutPageVisits || 0

  return {
    linearStages: [
      { id: 'visits', label: 'About Visits', count: skoolAboutVisits, color: '#6b7280' },
      { id: 'members', label: 'Members', count: skoolMembers, color: '#94a3b8' },
      { id: 'handsRaised', label: 'Hands Raised', count: getStageCount('hand_raiser'), color: '#60a5fa' },
    ],
    premiumPath: [
      { id: 'premiumQualified', label: 'Qualified', count: getStageCount('qualified_premium'), color: '#f472b6' },
      { id: 'premiumOffers', label: 'Offers Made', count: getStageCount('offer_made_premium'), color: '#ec4899' },
      { id: 'premium', label: 'Premium', count: getStageCount('premium'), color: '#22c55e' },
    ],
    vipPath: [
      { id: 'vipQualified', label: 'Qualified', count: getStageCount('qualified_vip'), color: '#a78bfa' },
      { id: 'vipOffers', label: 'Offers Made', count: getStageCount('offer_made_vip'), color: '#8b5cf6' },
      { id: 'vip', label: 'VIP', count: getStageCount('vip'), color: '#FF692D' },
    ],
    totalExpenses,
  }
}
