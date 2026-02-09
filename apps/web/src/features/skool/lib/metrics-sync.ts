/**
 * Skool Metrics Sync
 *
 * Syncs Skool group KPIs to the skool_metrics table.
 * Uses the admin/analytics APIs that Skoot uses.
 */

import { createServerClient } from '@0ne/db/server'
import { getSkoolClient } from './skool-client'
import { DEFAULT_GROUP } from './config'

// =============================================================================
// TYPES
// =============================================================================

// Time series data point from Skool admin metrics
interface TimeSeriesPoint {
  value: number
  time: string
}

// Admin metrics returns time series for each metric
interface AdminMetricsResponse {
  total_members?: TimeSeriesPoint[] | number
  active_members?: TimeSeriesPoint[] | number
  activity_score?: TimeSeriesPoint[] | number
  // The API response structure may vary
  [key: string]: unknown
}

// Helper to extract latest value from time series or direct number
function getLatestValue(data: TimeSeriesPoint[] | number | undefined): number | null {
  if (data === undefined || data === null) return null
  if (typeof data === 'number') return data
  if (Array.isArray(data) && data.length > 0) {
    // First item is typically the most recent
    return data[0]?.value ?? null
  }
  return null
}

interface DiscoveryResponse {
  category?: {
    id?: string
    name?: string
  }
  category_rank?: number
  [key: string]: unknown
}

interface AnalyticsOverviewResponse {
  conversion?: number
  [key: string]: unknown
}

interface AnalyticsChartResponse {
  chart_data?: {
    items?: Array<{
      date?: string
      value?: number
      page_visits?: number // Actual field name from Skool API
      conversion_rate?: number
      [key: string]: unknown
    }>
  }
  [key: string]: unknown
}

export interface SkoolMetricsSnapshot {
  group_slug: string
  snapshot_date: string
  members_total: number | null
  members_active: number | null
  community_activity: number | null
  category: string | null
  category_rank: number | null
  about_page_visits: number | null
  conversion_rate: number | null
}

// =============================================================================
// SKOOL ADMIN API FUNCTIONS
// =============================================================================

/**
 * Fetch admin metrics (total members, active members, activity)
 * Endpoint: /groups/{slug}/admin-metrics?range=30d&amt=monthly
 */
async function fetchAdminMetrics(
  skoolClient: ReturnType<typeof getSkoolClient>,
  groupSlug: string
): Promise<AdminMetricsResponse | null> {
  try {
    const response = await skoolClient.fetchWithAuth(
      `https://api2.skool.com/groups/${groupSlug}/admin-metrics?range=30d&amt=monthly`
    )

    if (!response.ok) {
      console.error(`[Skool Metrics] Admin metrics failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Skool Metrics] Error fetching admin metrics:', error)
    return null
  }
}

/**
 * Fetch discovery data (category rank)
 * Endpoint: /groups/{slug}/discovery
 */
async function fetchDiscovery(
  skoolClient: ReturnType<typeof getSkoolClient>,
  groupSlug: string
): Promise<DiscoveryResponse | null> {
  try {
    const response = await skoolClient.fetchWithAuth(
      `https://api2.skool.com/groups/${groupSlug}/discovery`
    )

    if (!response.ok) {
      console.error(`[Skool Metrics] Discovery failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Skool Metrics] Error fetching discovery:', error)
    return null
  }
}

/**
 * Fetch analytics overview (conversion rate)
 * Endpoint: /groups/{slug}/analytics-overview
 */
async function fetchAnalyticsOverview(
  skoolClient: ReturnType<typeof getSkoolClient>,
  groupSlug: string
): Promise<AnalyticsOverviewResponse | null> {
  try {
    const response = await skoolClient.fetchWithAuth(
      `https://api2.skool.com/groups/${groupSlug}/analytics-overview`
    )

    if (!response.ok) {
      console.error(`[Skool Metrics] Analytics overview failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Skool Metrics] Error fetching analytics overview:', error)
    return null
  }
}

/**
 * Fetch about page conversion chart - today's visits only
 * Endpoint: /groups/{slug}/analytics?chart=conversion_about_by_day
 */
async function fetchAboutPageVisits(
  skoolClient: ReturnType<typeof getSkoolClient>,
  groupSlug: string
): Promise<number | null> {
  try {
    const response = await skoolClient.fetchWithAuth(
      `https://api2.skool.com/groups/${groupSlug}/analytics?chart=conversion_about_by_day`
    )

    if (!response.ok) {
      console.error(`[Skool Metrics] About page chart failed: ${response.status}`)
      return null
    }

    const data: AnalyticsChartResponse = await response.json()
    const items = data?.chart_data?.items || []

    // Sum today's visits (or latest day's data)
    if (items.length > 0) {
      const latestItem = items[items.length - 1]
      return latestItem?.page_visits || latestItem?.value || 0
    }

    return 0
  } catch (error) {
    console.error('[Skool Metrics] Error fetching about page visits:', error)
    return null
  }
}

/**
 * Fetch total about page visits (sum of all time)
 * Endpoint: /groups/{slug}/analytics?chart=conversion_about_by_day
 *
 * Note: The API only returns last 30 days by default.
 * We try different date ranges to get more historical data.
 */
async function fetchAboutPageVisitsTotal(
  skoolClient: ReturnType<typeof getSkoolClient>,
  groupSlug: string
): Promise<number | null> {
  try {
    // Try with "all" range first for all-time data
    const response = await skoolClient.fetchWithAuth(
      `https://api2.skool.com/groups/${groupSlug}/analytics?chart=conversion_about_by_day&range=all`
    )

    if (!response.ok) {
      console.error(`[Skool Metrics] About page chart failed: ${response.status}`)
      return null
    }

    const data: AnalyticsChartResponse = await response.json()
    const items = data?.chart_data?.items || []

    // Debug: log first item structure
    if (items.length > 0) {
      console.log(`[Skool Metrics] About page sample item:`, JSON.stringify(items[0]))
    }

    // Sum all visits across all days (field is called page_visits, not value)
    const total = items.reduce((sum, item) => sum + (item?.page_visits || item?.value || 0), 0)
    console.log(`[Skool Metrics] About page visits total: ${total} (from ${items.length} days)`)
    return total
  } catch (error) {
    console.error('[Skool Metrics] Error fetching about page visits:', error)
    return null
  }
}

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================

/**
 * Sync Skool metrics to the database
 *
 * Creates a daily snapshot of key Skool KPIs:
 * - Members total (from synced members table)
 * - Members active (from "active" tab - not churned/banned)
 * - Community activity score
 * - Category rank
 * - About page visits (sum of all time)
 * - Conversion rate
 */
export async function syncSkoolMetrics(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{ success: boolean; snapshot?: SkoolMetricsSnapshot; error?: string }> {
  const supabase = createServerClient()
  const skool = getSkoolClient()

  console.log(`[Skool Metrics] Starting metrics sync for group: ${groupSlug}`)

  try {
    // Get actual member counts from our synced data
    const { count: syncedMembersCount } = await supabase
      .from('skool_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_slug', groupSlug)

    // Fetch API metrics in parallel
    const [adminMetrics, discovery, analyticsOverview, aboutVisitsData, adminCount] = await Promise.all([
      fetchAdminMetrics(skool, groupSlug),
      fetchDiscovery(skool, groupSlug),
      fetchAnalyticsOverview(skool, groupSlug),
      fetchAboutPageVisitsTotal(skool, groupSlug), // Get total, not just today
      skool.getAdminCount(groupSlug), // Get admin count to exclude from active
    ])

    // Build snapshot
    // NOTE: members_active from admin API means "active in last 30 days", not "non-churned"
    // For funnel purposes, we want non-churned members EXCLUDING admins (what Skool UI shows)
    const today = new Date().toISOString().split('T')[0]

    console.log(`[Skool Metrics] Admin count: ${adminCount}`)

    const snapshot: SkoolMetricsSnapshot = {
      group_slug: groupSlug,
      snapshot_date: today,
      // Total = all synced members including admins
      members_total: syncedMembersCount || getLatestValue(adminMetrics?.total_members),
      // Active = synced members minus admins (matches Skool UI's "active" count)
      members_active: syncedMembersCount ? syncedMembersCount - adminCount : 0,
      community_activity: getLatestValue(adminMetrics?.activity_score),
      category: discovery?.category?.name ?? null,
      category_rank: discovery?.category_rank ?? null,
      about_page_visits: aboutVisitsData,
      conversion_rate: analyticsOverview?.conversion
        ? Math.round(analyticsOverview.conversion * 10000) / 100 // Convert to percentage
        : null,
    }

    console.log('[Skool Metrics] Snapshot:', snapshot)

    // Upsert to database (one per day per group)
    const { error: upsertError } = await supabase
      .from('skool_metrics')
      .upsert(snapshot, { onConflict: 'group_slug,snapshot_date' })

    if (upsertError) {
      console.error('[Skool Metrics] Upsert error:', upsertError)
      return { success: false, error: upsertError.message }
    }

    console.log('[Skool Metrics] Successfully saved metrics snapshot')
    return { success: true, snapshot }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Skool Metrics] Fatal error:', message)
    return { success: false, error: message }
  }
}

/**
 * Get latest metrics for a group
 */
export async function getLatestMetrics(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<SkoolMetricsSnapshot | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('skool_metrics')
    .select('*')
    .eq('group_slug', groupSlug)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as SkoolMetricsSnapshot
}

/**
 * Get metrics history for a group
 */
export async function getMetricsHistory(
  groupSlug: string = DEFAULT_GROUP.slug,
  days: number = 30
): Promise<SkoolMetricsSnapshot[]> {
  const supabase = createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('skool_metrics')
    .select('*')
    .eq('group_slug', groupSlug)
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as SkoolMetricsSnapshot[]
}
