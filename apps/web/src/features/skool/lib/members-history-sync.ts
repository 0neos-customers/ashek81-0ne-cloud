/**
 * Skool Members History Sync
 *
 * Syncs monthly and daily member counts from Skool API to database.
 * Provides date-filtered member counts for KPI dashboard.
 */

import { createServerClient } from '@0ne/db/server'
import { getSkoolClient } from './skool-client'
import { DEFAULT_GROUP } from './config'

// =============================================================================
// TYPES
// =============================================================================

interface MonthlyMemberData {
  date: string // YYYY-MM-01
  new: number
  existing: number
  churned: number
  total: number
}

interface DailyMemberData {
  value: number
  time: string // ISO timestamp
}

interface AdminMetricsResponse {
  total_members: DailyMemberData[]
  active_members: DailyMemberData[]
  latest_active_members: number
}

interface MembersChartResponse {
  chart_data: {
    items: MonthlyMemberData[]
  }
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetch monthly member breakdown from Skool API
 * Returns data since group creation (June 2025 for Fruitful)
 */
export async function fetchMonthlyMemberData(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<MonthlyMemberData[]> {
  const skool = getSkoolClient()

  try {
    const url = `https://api2.skool.com/groups/${groupSlug}/analytics?chart=members&range=all`
    console.log(`[Members History] Fetching monthly data: ${url}`)

    const response = await skool.fetchWithAuth(url)
    if (!response.ok) {
      console.error(`[Members History] Monthly fetch failed: ${response.status}`)
      return []
    }

    const data: MembersChartResponse = await response.json()
    const items = data?.chart_data?.items || []

    console.log(`[Members History] Got ${items.length} months of data`)
    return items
  } catch (error) {
    console.error('[Members History] Error fetching monthly data:', error)
    return []
  }
}

/**
 * Fetch daily member counts from Skool admin-metrics API
 * Returns last 30 days of data
 */
export async function fetchDailyMemberData(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{ total: DailyMemberData[]; active: DailyMemberData[] }> {
  const skool = getSkoolClient()

  try {
    const url = `https://api2.skool.com/groups/${groupSlug}/admin-metrics?range=30d&amt=daily`
    console.log(`[Members History] Fetching daily data: ${url}`)

    const response = await skool.fetchWithAuth(url)
    if (!response.ok) {
      console.error(`[Members History] Daily fetch failed: ${response.status}`)
      return { total: [], active: [] }
    }

    const data: AdminMetricsResponse = await response.json()

    console.log(`[Members History] Got ${data.total_members?.length || 0} days of data`)
    return {
      total: data.total_members || [],
      active: data.active_members || [],
    }
  } catch (error) {
    console.error('[Members History] Error fetching daily data:', error)
    return { total: [], active: [] }
  }
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Sync monthly member data to database
 */
export async function syncMonthlyMemberData(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{ synced: number; errors: number }> {
  const supabase = createServerClient()
  const monthlyData = await fetchMonthlyMemberData(groupSlug)

  if (monthlyData.length === 0) {
    return { synced: 0, errors: 0 }
  }

  let synced = 0
  let errors = 0

  // Upsert each month's data
  const rows = monthlyData.map((item) => ({
    group_slug: groupSlug,
    month: item.date,
    new_members: item.new,
    existing_members: item.existing,
    churned_members: Math.abs(item.churned), // Skool returns negative
    total_members: item.total,
    source: 'skool_api',
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('skool_members_monthly')
    .upsert(rows, { onConflict: 'group_slug,month' })

  if (error) {
    console.error('[Members History] Error saving monthly data:', error)
    errors = rows.length
  } else {
    synced = rows.length
    console.log(`[Members History] Synced ${synced} months of data`)
  }

  return { synced, errors }
}

/**
 * Sync daily member data to database
 */
export async function syncDailyMemberData(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{ synced: number; errors: number }> {
  const supabase = createServerClient()
  const { total, active } = await fetchDailyMemberData(groupSlug)

  if (total.length === 0) {
    return { synced: 0, errors: 0 }
  }

  // Build rows with active members matched by date
  const activeByDate = new Map(
    active.map((a) => [a.time.split('T')[0], a.value])
  )

  // Sort by date to calculate new_members (delta from previous day)
  const sorted = [...total].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  )

  const rows = sorted.map((item, index) => {
    const date = item.time.split('T')[0]
    const prevTotal = index > 0 ? sorted[index - 1].value : item.value
    const newMembers = item.value - prevTotal

    return {
      group_slug: groupSlug,
      date,
      total_members: item.value,
      active_members: activeByDate.get(date) || null,
      new_members: newMembers,
      source: 'skool_api',
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase
    .from('skool_members_daily')
    .upsert(rows, { onConflict: 'group_slug,date' })

  if (error) {
    console.error('[Members History] Error saving daily data:', error)
    return { synced: 0, errors: rows.length }
  }

  console.log(`[Members History] Synced ${rows.length} days of data`)
  return { synced: rows.length, errors: 0 }
}

/**
 * Backfill daily data by interpolating from monthly totals
 * Fills gaps between the 30-day API window and older months
 */
export async function backfillDailyFromMonthly(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{ interpolated: number; errors: number }> {
  const supabase = createServerClient()

  // Get all monthly data
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('skool_members_monthly')
    .select('*')
    .eq('group_slug', groupSlug)
    .order('month', { ascending: true })

  if (monthlyError || !monthlyData || monthlyData.length === 0) {
    console.error('[Members History] No monthly data for backfill')
    return { interpolated: 0, errors: 1 }
  }

  // Get existing daily data (to avoid overwriting API data)
  const { data: existingDaily } = await supabase
    .from('skool_members_daily')
    .select('date')
    .eq('group_slug', groupSlug)
    .eq('source', 'skool_api')

  const apiDates = new Set(existingDaily?.map((d) => d.date) || [])

  let interpolated = 0
  const errors = 0

  // Process each month
  for (let i = 0; i < monthlyData.length; i++) {
    const month = monthlyData[i]
    const monthDate = new Date(month.month)
    const prevMonth = i > 0 ? monthlyData[i - 1] : null

    // Calculate daily values
    const startTotal = prevMonth?.total_members || 0
    const endTotal = month.total_members
    const daysInMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    ).getDate()
    const dailyGrowth = (endTotal - startTotal) / daysInMonth

    const interpolatedRows = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
      const dateStr = date.toISOString().split('T')[0]

      // Skip if we have API data for this date
      if (apiDates.has(dateStr)) {
        continue
      }

      // Skip future dates
      if (date > new Date()) {
        continue
      }

      const totalMembers = Math.round(startTotal + dailyGrowth * day)
      const newMembers = day === 1 ? 0 : Math.round(dailyGrowth)

      interpolatedRows.push({
        group_slug: groupSlug,
        date: dateStr,
        total_members: totalMembers,
        active_members: null,
        new_members: newMembers,
        source: 'interpolated',
        updated_at: new Date().toISOString(),
      })
    }

    if (interpolatedRows.length > 0) {
      const { error } = await supabase
        .from('skool_members_daily')
        .upsert(interpolatedRows, { onConflict: 'group_slug,date' })

      if (!error) {
        interpolated += interpolatedRows.length
      }
    }
  }

  console.log(`[Members History] Interpolated ${interpolated} days from monthly data`)
  return { interpolated, errors }
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get member count for a specific date range
 */
export async function getMemberCountForPeriod(
  groupSlug: string = DEFAULT_GROUP.slug,
  startDate: string,
  endDate: string
): Promise<{
  startCount: number
  endCount: number
  newMembersInPeriod: number
  avgDailyMembers: number
} | null> {
  const supabase = createServerClient()

  // Get data for the date range
  const { data, error } = await supabase
    .from('skool_members_daily')
    .select('date, total_members, new_members')
    .eq('group_slug', groupSlug)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error || !data || data.length === 0) {
    console.log(`[Members History] No data for ${startDate} to ${endDate}`)
    return null
  }

  const startCount = data[0].total_members
  const endCount = data[data.length - 1].total_members
  const newMembersInPeriod = data.reduce((sum, d) => sum + (d.new_members || 0), 0)
  const avgDailyMembers =
    data.reduce((sum, d) => sum + d.total_members, 0) / data.length

  return {
    startCount,
    endCount,
    newMembersInPeriod,
    avgDailyMembers: Math.round(avgDailyMembers),
  }
}

/**
 * Get member count for a specific date (for funnel display)
 */
export async function getMemberCountForDate(
  groupSlug: string = DEFAULT_GROUP.slug,
  date: string
): Promise<number | null> {
  const supabase = createServerClient()

  // Try exact date first
  const { data: exactData } = await supabase
    .from('skool_members_daily')
    .select('total_members')
    .eq('group_slug', groupSlug)
    .eq('date', date)
    .single()

  if (exactData) {
    return exactData.total_members
  }

  // Fall back to closest earlier date
  const { data: closestData } = await supabase
    .from('skool_members_daily')
    .select('total_members')
    .eq('group_slug', groupSlug)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)

  return closestData?.[0]?.total_members || null
}

// =============================================================================
// FULL SYNC
// =============================================================================

/**
 * Run full member history sync:
 * 1. Sync monthly data from API
 * 2. Sync daily data from API (last 30 days)
 * 3. Backfill daily data from monthly totals
 */
export async function syncMemberHistory(
  groupSlug: string = DEFAULT_GROUP.slug,
  options: { skipBackfill?: boolean } = {}
): Promise<{
  monthly: { synced: number; errors: number }
  daily: { synced: number; errors: number }
  backfill: { interpolated: number; errors: number }
}> {
  console.log(`[Members History] Starting full sync for ${groupSlug}`)

  const [monthly, daily] = await Promise.all([
    syncMonthlyMemberData(groupSlug),
    syncDailyMemberData(groupSlug),
  ])

  let backfill = { interpolated: 0, errors: 0 }
  if (!options.skipBackfill) {
    backfill = await backfillDailyFromMonthly(groupSlug)
  }

  console.log(`[Members History] Sync complete:`, { monthly, daily, backfill })
  return { monthly, daily, backfill }
}
