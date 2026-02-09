/**
 * Skool Community Activity Sync
 *
 * Syncs daily community activity data from Skool API to database:
 * - activity_count: Total engagement (posts, comments, reactions)
 * - daily_active_members: Unique members active that day
 *
 * Provides date-filtered activity data for KPI dashboard.
 */

import { createServerClient } from '@0ne/db/server'
import { getSkoolClient } from './skool-client'
import { DEFAULT_GROUP } from './config'

// =============================================================================
// TYPES
// =============================================================================

interface TimeSeriesPoint {
  value: number
  time: string // ISO timestamp
}

interface DailyActivitiesData {
  start_date: string // ISO timestamp
  end_date: string   // ISO timestamp
  counts: number[]   // Array of daily counts
}

interface AdminMetricsResponse {
  daily_activities?: DailyActivitiesData
  active_members?: TimeSeriesPoint[] // Daily active members (when amt=daily)
  [key: string]: unknown
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetch daily activities and active members from Skool admin-metrics API
 * Returns full history from community start date
 */
export async function fetchDailyActivities(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{
  dailyActivities: DailyActivitiesData | null
  activeMembers: TimeSeriesPoint[] | null
}> {
  const skool = getSkoolClient()

  try {
    // admin-metrics with amt=daily returns:
    // - daily_activities: full history heatmap data
    // - active_members: last 30 days of daily active member counts
    const url = `https://api2.skool.com/groups/${groupSlug}/admin-metrics?range=30d&amt=daily`
    console.log(`[Community Activity] Fetching: ${url}`)

    const response = await skool.fetchWithAuth(url)
    if (!response.ok) {
      console.error(`[Community Activity] Fetch failed: ${response.status}`)
      return { dailyActivities: null, activeMembers: null }
    }

    const data: AdminMetricsResponse = await response.json()
    const dailyActivities = data?.daily_activities || null
    const activeMembers = Array.isArray(data?.active_members) ? data.active_members : null

    if (dailyActivities) {
      console.log(`[Community Activity] Got ${dailyActivities.counts.length} days of activity data`)
      console.log(`[Community Activity] Date range: ${dailyActivities.start_date} to ${dailyActivities.end_date}`)
    }

    if (activeMembers) {
      console.log(`[Community Activity] Got ${activeMembers.length} days of active members data`)
    }

    return { dailyActivities, activeMembers }
  } catch (error) {
    console.error('[Community Activity] Error fetching data:', error)
    return { dailyActivities: null, activeMembers: null }
  }
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Sync community activity data to database
 * Parses the counts array with start_date to generate date-keyed rows
 * Also merges daily active members data when available
 */
export async function syncCommunityActivity(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{ synced: number; errors: number }> {
  const supabase = createServerClient()
  const { dailyActivities, activeMembers } = await fetchDailyActivities(groupSlug)

  if (!dailyActivities || !dailyActivities.counts || dailyActivities.counts.length === 0) {
    return { synced: 0, errors: 0 }
  }

  const { start_date, counts } = dailyActivities

  // Parse start date
  const startDate = new Date(start_date)

  // Build a map of active members by date (from the active_members array)
  // This only has last 30 days but we'll merge it with activity data
  const activeMembersMap = new Map<string, number>()
  if (activeMembers && Array.isArray(activeMembers)) {
    activeMembers.forEach((point) => {
      const dateStr = point.time.split('T')[0]
      activeMembersMap.set(dateStr, point.value)
    })
    console.log(`[Community Activity] Built active members map with ${activeMembersMap.size} entries`)
  }

  // Build rows for each day, using a Map to deduplicate by date
  // (handles any timezone edge cases that might create duplicate dates)
  const rowsMap = new Map<string, {
    group_slug: string
    date: string
    activity_count: number
    daily_active_members: number | null
    source: string
    updated_at: string
  }>()

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  counts.forEach((count, index) => {
    // Calculate date for this index using UTC to avoid timezone issues
    const date = new Date(startDate.getTime())
    date.setUTCDate(date.getUTCDate() + index)
    const dateStr = date.toISOString().split('T')[0]

    // Skip future dates
    if (dateStr > todayStr) {
      return
    }

    // Use Map to ensure uniqueness - later entries overwrite earlier ones
    rowsMap.set(dateStr, {
      group_slug: groupSlug,
      date: dateStr,
      activity_count: count,
      daily_active_members: activeMembersMap.get(dateStr) ?? null,
      source: 'skool_api',
      updated_at: new Date().toISOString(),
    })
  })

  const rows = Array.from(rowsMap.values())

  console.log(`[Community Activity] Preparing ${rows.length} rows for upsert`)
  console.log(`[Community Activity] Rows with active members data: ${rows.filter(r => r.daily_active_members !== null).length}`)

  // Batch upsert in chunks to avoid request size limits
  const batchSize = 500
  let synced = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('skool_community_activity_daily')
      .upsert(batch, { onConflict: 'group_slug,date' })

    if (error) {
      console.error(`[Community Activity] Batch ${i / batchSize + 1} error:`, error)
      errors += batch.length
    } else {
      synced += batch.length
    }
  }

  console.log(`[Community Activity] Synced ${synced} rows, ${errors} errors`)
  return { synced, errors }
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get community activity for a specific date range
 */
export async function getCommunityActivityForPeriod(
  groupSlug: string = DEFAULT_GROUP.slug,
  startDate: string,
  endDate: string
): Promise<{
  daily: Array<{
    date: string
    activityCount: number
    dailyActiveMembers: number | null
  }>
  totals: {
    totalActivity: number
    avgDailyActivity: number
    avgDailyActiveMembers: number | null
  }
} | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('skool_community_activity_daily')
    .select('date, activity_count, daily_active_members')
    .eq('group_slug', groupSlug)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error || !data || data.length === 0) {
    console.log(`[Community Activity] No data for ${startDate} to ${endDate}`)
    return null
  }

  const totalActivity = data.reduce((sum, d) => sum + d.activity_count, 0)
  const avgDailyActivity = Math.round(totalActivity / data.length)

  // Calculate average active members (only for days we have data)
  const daysWithActiveMembers = data.filter(d => d.daily_active_members !== null)
  const avgDailyActiveMembers = daysWithActiveMembers.length > 0
    ? Math.round(
        daysWithActiveMembers.reduce((sum, d) => sum + (d.daily_active_members || 0), 0) /
          daysWithActiveMembers.length
      )
    : null

  return {
    daily: data.map(d => ({
      date: d.date,
      activityCount: d.activity_count,
      dailyActiveMembers: d.daily_active_members,
    })),
    totals: {
      totalActivity,
      avgDailyActivity,
      avgDailyActiveMembers,
    },
  }
}

/**
 * Get latest activity count
 */
export async function getLatestActivityCount(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<number | null> {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('skool_community_activity_daily')
    .select('activity_count')
    .eq('group_slug', groupSlug)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  return data?.activity_count ?? null
}
