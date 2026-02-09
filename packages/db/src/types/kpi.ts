// KPI Dashboard database types

export type FunnelStage = 'lead' | 'hand_raiser' | 'qualified' | 'vip' | 'premium' | 'funded'
export type CreditStatus = 'good' | 'bad' | 'unknown'
export type ExpenseFrequency = 'one_time' | 'monthly' | 'annual'
export type RevenueType = 'vip_setup' | 'success_fee' | 'premium' | 'other'
export type CampaignType = 'workshop' | 'evergreen' | 'challenge'
export type SnapshotType = 'epl' | 'ltv' | 'revenue'
export type Platform = 'meta' | 'youtube' | 'google'

// Legacy source type (marketing channels - not matching actual data)
export type Source = 'meta_ads' | 'youtube' | 'organic' | 'referral'

// Attribution sources from Skool member data (verified from database)
// See BUILD-STATE.md for full breakdown with counts
export type AttributionSource =
  | 'facebook'    // 743 members (25.9%)
  | 'instagram'   // 403 members (14.0%)
  | 'direct'      // 224 members (7.8%)
  | 'discovery'   // 143 members (5.0%)
  | 'affiliate'   // 131 members (4.6%)
  | 'invite'      // 76 members (2.6%)
  | 'profile'     // 70 members (2.4%)
  | 'internal'    // 15 members (0.5%)
  | 'google'      // 2 members
  | 'threads'     // 1 member
  | null          // 1,059 members (36.9%) - displayed as "Unknown"

// Source display labels for UI
export const ATTRIBUTION_SOURCE_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  direct: 'Direct',
  discovery: 'Discovery (Skool)',
  affiliate: 'Affiliate',
  invite: 'Invite',
  profile: 'Profile',
  internal: 'Internal',
  google: 'Google',
  threads: 'Threads',
  unknown: 'Unknown',
}

export interface Contact {
  id: string
  ghl_contact_id: string | null
  skool_user_id: string | null
  current_stage: FunnelStage
  credit_status: CreditStatus
  lead_age: number
  client_age: number
  source: Source | null
  campaign: string | null
  hand_raiser_type: string | null
  created_at: string
  updated_at: string
  became_lead_at: string | null
  became_hand_raiser_at: string | null
  became_qualified_at: string | null
  became_client_at: string | null
  became_funded_at: string | null
}

export interface Event {
  id: string
  contact_id: string
  event_type: string
  event_data: Record<string, unknown> | null
  source: string | null
  campaign: string | null
  created_at: string
}

export interface CohortSnapshot {
  id: string
  contact_id: string
  snapshot_type: SnapshotType
  snapshot_day: number
  value: number
  created_at: string
}

export interface Campaign {
  id: string
  name: string
  slug: string
  type: CampaignType | null
  start_date: string | null
  end_date: string | null
  ad_budget: number | null
  revenue_target: number | null
  is_active: boolean
  created_at: string
}

export interface AdMetric {
  id: string
  date: string
  platform: Platform
  campaign_id: string | null
  campaign_meta_id: string | null
  campaign_name: string | null
  adset_id: string | null
  adset_name: string | null
  ad_id: string | null
  ad_name: string | null
  spend: number
  impressions: number
  clicks: number
  reach: number
  frequency: number
  unique_clicks: number
  link_clicks: number
  landing_page_views: number
  completed_registrations: number
  conversions: number
  cost_per_conversion: number
  roas: number
  cpm: number
  cpc: number
  ctr: number
  created_at: string
}

export interface Expense {
  id: string
  name: string
  category: string | null
  amount: number
  frequency: ExpenseFrequency
  start_date: string | null
  end_date: string | null
  expense_date: string | null
  is_active: boolean
  created_at: string
}

export interface Revenue {
  id: string
  contact_id: string | null
  amount: number
  type: RevenueType | null
  description: string | null
  source: string
  transaction_date: string
  campaign_id: string | null
  created_at: string
}

export interface DailyAggregate {
  id: string
  date: string
  campaign_id: string | null
  source: string | null
  new_leads: number
  new_hand_raisers: number
  new_qualified: number
  new_vip: number
  new_premium: number
  new_funded: number
  total_revenue: number
  vip_revenue: number
  premium_revenue: number
  success_fee_revenue: number
  ad_spend: number
  expenses: number
  total_funded_amount: number
  funded_count: number
  created_at: string
}

export interface FunnelConversion {
  campaign_id: string | null
  leads: number
  hand_raisers: number
  qualified: number
  vip: number
  premium: number
  funded: number
  total_spend: number
  total_revenue: number
  lead_to_hr_rate: number
  hr_to_qualified_rate: number
  qualified_to_client_rate: number
  cost_per_lead: number
  cost_per_hand_raiser: number
  cac: number
}

export interface DateRange {
  from: Date
  to: Date
}

export interface DashboardFilters {
  dateRange: DateRange
  campaignId: string | null
  source: Source | null
}
