import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'
import { getSkoolClient } from '@/features/skool/lib/skool-client'
import { DEFAULT_GROUP } from '@/features/skool/lib/config'

export const dynamic = 'force-dynamic'

// Types for Skool analytics API response
interface AnalyticsChartItem {
  date: string
  page_visits?: number
  value?: number
  conversion_rate?: number
}

interface AnalyticsChartResponse {
  chart_data?: {
    items?: AnalyticsChartItem[]
  }
}

// Response types for our API
export interface DailyDataPoint {
  date: string
  visitors: number
  conversionRate: number
}

export interface MonthlyDataPoint {
  month: string
  visitors: number
  conversionRate: number
}

export interface AboutAnalyticsResponse {
  daily: DailyDataPoint[]
  monthly: MonthlyDataPoint[]
  totals: {
    totalVisitors: number
    totalNewMembers: number
    avgConversionRate: number
    avgDailyVisitors: number
  }
  period: {
    range: '30d' | '1y'
    startDate: string
    endDate: string
  }
  source: 'db' | 'api' | 'mixed'
  /**
   * About page visits are aggregate data from Skool's analytics.
   * Source filtering is NOT available for this data because attribution
   * happens AFTER a visitor becomes a member (visitors are tracked before joining).
   * The attribution_source is recorded on the member, not the visitor.
   */
  sourceFilteringNote?: string
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Get daily data from our database
 * Joins about page visits with new members to calculate conversion rate
 */
async function getFromDatabase(
  startDate: string,
  endDate: string
): Promise<DailyDataPoint[]> {
  const supabase = createServerClient()

  // Get about page visits
  const { data: aboutData, error: aboutError } = await supabase
    .from('skool_about_page_daily')
    .select('date, visitors, conversion_rate')
    .eq('group_slug', DEFAULT_GROUP.slug)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (aboutError) {
    console.error('[About Analytics] DB read error:', aboutError)
    return []
  }

  // Get new members data to calculate actual conversion rate
  const { data: membersData } = await supabase
    .from('skool_members_daily')
    .select('date, new_members')
    .eq('group_slug', DEFAULT_GROUP.slug)
    .gte('date', startDate)
    .lte('date', endDate)

  // Create a map of date -> new_members
  const newMembersMap = new Map<string, number>()
  membersData?.forEach((row) => {
    newMembersMap.set(row.date, row.new_members || 0)
  })

  return (aboutData || []).map((row) => {
    const visitors = row.visitors || 0
    const newMembers = newMembersMap.get(row.date) || 0
    // Calculate conversion rate from visitors to new members
    const conversionRate = visitors > 0 ? (newMembers / visitors) * 100 : 0

    return {
      date: row.date,
      visitors,
      conversionRate: Math.round(conversionRate * 10) / 10,
    }
  })
}

/**
 * Save daily data to our database (upsert)
 */
async function saveToDatabase(data: DailyDataPoint[]): Promise<number> {
  if (data.length === 0) return 0

  const supabase = createServerClient()

  const rows = data.map((d) => ({
    group_slug: DEFAULT_GROUP.slug,
    date: d.date,
    visitors: d.visitors,
    conversion_rate: d.conversionRate,
  }))

  const { error, count } = await supabase
    .from('skool_about_page_daily')
    .upsert(rows, { onConflict: 'group_slug,date' })

  if (error) {
    console.error('[About Analytics] DB save error:', error)
    return 0
  }

  console.log(`[About Analytics] Saved ${rows.length} rows to DB`)
  return count || rows.length
}

// =============================================================================
// SKOOL API OPERATIONS
// =============================================================================

/**
 * Fetch DAILY about page analytics from Skool API
 * Uses: chart=conversion_about_by_day
 * Returns: Last 30 days of daily data
 */
async function fetchDailyFromSkoolAPI(): Promise<DailyDataPoint[]> {
  const skool = getSkoolClient()
  const groupSlug = DEFAULT_GROUP.slug

  try {
    const url = `https://api2.skool.com/groups/${groupSlug}/analytics?chart=conversion_about_by_day&range=30`
    console.log(`[About Analytics] Fetching daily from Skool: ${url}`)

    const response = await skool.fetchWithAuth(url)

    if (!response.ok) {
      console.error(`[About Analytics] Skool API failed: ${response.status}`)
      return []
    }

    const data: AnalyticsChartResponse = await response.json()
    const items = data?.chart_data?.items || []

    console.log(`[About Analytics] Got ${items.length} daily data points`)
    if (items.length > 0) {
      console.log(`[About Analytics] Date range: ${items[0]?.date} to ${items[items.length - 1]?.date}`)
    }

    return items.map((item) => ({
      date: item.date,
      visitors: item.page_visits || item.value || 0,
      conversionRate: item.conversion_rate ? item.conversion_rate * 100 : 0,
    }))
  } catch (error) {
    console.error('[About Analytics] Skool API error:', error)
    return []
  }
}

/**
 * Fetch MONTHLY about page analytics from Skool API
 * Uses: chart=conversion_about (NOT _by_day)
 * Returns: All historical monthly data since group started
 */
async function fetchMonthlyFromSkoolAPI(): Promise<MonthlyDataPoint[]> {
  const skool = getSkoolClient()
  const groupSlug = DEFAULT_GROUP.slug

  try {
    // Key discovery: chart=conversion_about (without _by_day) returns monthly aggregated data
    const url = `https://api2.skool.com/groups/${groupSlug}/analytics?chart=conversion_about&range=all`
    console.log(`[About Analytics] Fetching monthly from Skool: ${url}`)

    const response = await skool.fetchWithAuth(url)

    if (!response.ok) {
      console.error(`[About Analytics] Skool API failed: ${response.status}`)
      return []
    }

    const data: AnalyticsChartResponse = await response.json()
    const items = data?.chart_data?.items || []

    console.log(`[About Analytics] Got ${items.length} monthly data points`)
    if (items.length > 0) {
      console.log(`[About Analytics] Date range: ${items[0]?.date} to ${items[items.length - 1]?.date}`)
    }

    // Map to our format - date is in YYYY-MM-DD format (first of month)
    return items.map((item) => ({
      month: item.date.substring(0, 7), // YYYY-MM
      visitors: item.page_visits || item.value || 0,
      conversionRate: item.conversion_rate ? item.conversion_rate * 100 : 0,
    }))
  } catch (error) {
    console.error('[About Analytics] Skool API error:', error)
    return []
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Aggregate daily data into monthly data
 */
function aggregateMonthly(daily: DailyDataPoint[]): MonthlyDataPoint[] {
  const monthlyMap = new Map<string, { visitors: number; rates: number[]; count: number }>()

  daily.forEach((day) => {
    const month = day.date.substring(0, 7) // YYYY-MM

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { visitors: 0, rates: [], count: 0 })
    }

    const monthData = monthlyMap.get(month)!
    monthData.visitors += day.visitors
    if (day.conversionRate > 0) {
      monthData.rates.push(day.conversionRate)
    }
    monthData.count++
  })

  const monthly: MonthlyDataPoint[] = []
  monthlyMap.forEach((data, month) => {
    const avgRate = data.rates.length > 0
      ? data.rates.reduce((a, b) => a + b, 0) / data.rates.length
      : 0

    monthly.push({
      month,
      visitors: data.visitors,
      conversionRate: Math.round(avgRate * 10) / 10,
    })
  })

  return monthly.sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Get date range for query
 */
function getDateRange(range: '30d' | '1y'): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]

  let startDate: Date
  if (range === '1y') {
    startDate = new Date(now)
    startDate.setFullYear(startDate.getFullYear() - 1)
  } else {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 30)
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate,
  }
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') || '30d') as '30d' | '1y'
    const refresh = searchParams.get('refresh') === 'true'

    // Support explicit date range filtering (from page-level filter)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Sources parameter - note: about page data is NOT filterable by source
    // This is aggregate visitor data from before they became members
    const sourcesParam = searchParams.get('sources')
    const sources = sourcesParam ? sourcesParam.split(',').filter(Boolean) : []
    const sourceFilteringNote = sources.length > 0
      ? 'About page visits cannot be filtered by attribution source. Attribution is recorded when visitors become members, but visit tracking happens before membership.'
      : undefined

    console.log(`[About Analytics] Request: range=${range}, refresh=${refresh}, startDate=${startDateParam}, endDate=${endDateParam}${sources.length > 0 ? ` (sources ignored: ${sources.join(',')})` : ''}`)

    // Handle 30-day (daily) and 1-year (monthly) views differently
    // But if explicit dates are provided, always use daily data filtered to that range
    if (range === '1y' && !startDateParam && !endDateParam) {
      // For 1-year view WITHOUT explicit dates: Fetch monthly data directly from Skool API
      // This endpoint returns all historical monthly data
      const monthly = await fetchMonthlyFromSkoolAPI()

      if (monthly.length === 0) {
        return NextResponse.json({
          daily: [],
          monthly: [],
          totals: { totalVisitors: 0, totalNewMembers: 0, avgConversionRate: 0, avgDailyVisitors: 0 },
          period: { range, startDate: '', endDate: '' },
          source: 'api',
        })
      }

      const totalVisitors = monthly.reduce((sum, m) => sum + m.visitors, 0)
      const validRates = monthly.filter((m) => m.conversionRate > 0)
      const avgConversionRate = validRates.length > 0
        ? validRates.reduce((sum, m) => sum + m.conversionRate, 0) / validRates.length
        : 0

      const response: AboutAnalyticsResponse = {
        daily: [], // No daily data for 1-year view
        monthly,
        totals: {
          totalVisitors,
          totalNewMembers: 0, // Not available in monthly aggregation
          avgConversionRate: Math.round(avgConversionRate * 10) / 10,
          avgDailyVisitors: Math.round(totalVisitors / (monthly.length * 30)), // Estimate
        },
        period: {
          range,
          startDate: `${monthly[0]?.month}-01`,
          endDate: `${monthly[monthly.length - 1]?.month}-01`,
        },
        source: 'api',
        sourceFilteringNote,
      }

      return NextResponse.json(response)
    }

    // For daily view: Use explicit dates if provided, otherwise use range preset
    const { startDate, endDate } = (startDateParam && endDateParam)
      ? { startDate: startDateParam, endDate: endDateParam }
      : getDateRange(range)

    console.log(`[About Analytics] Using date range: ${startDate} to ${endDate}`)

    let daily: DailyDataPoint[] = []
    let source: 'db' | 'api' | 'mixed' = 'db'

    // Step 1: Try to get data from database first
    if (!refresh) {
      daily = await getFromDatabase(startDate, endDate)
      console.log(`[About Analytics] Got ${daily.length} rows from DB`)
    }

    // Step 2: If no data or refresh requested, fetch from Skool API
    if (daily.length === 0 || refresh) {
      const apiData = await fetchDailyFromSkoolAPI()

      if (apiData.length > 0) {
        // Filter to date range
        daily = apiData.filter((d) => d.date >= startDate && d.date <= endDate)

        // Save to database for future use
        await saveToDatabase(apiData)

        source = 'api'
        console.log(`[About Analytics] Using ${daily.length} rows from Skool API`)
      }
    }

    // Step 3: Check for gaps only when using default 30-day range (not explicit dates)
    // Skip gap-filling for explicit date ranges to avoid returning data outside the range
    if (source === 'db' && daily.length > 0 && daily.length < 24 && !startDateParam) {
      console.log(`[About Analytics] DB has gaps (${daily.length}/30), fetching from API`)
      const apiData = await fetchDailyFromSkoolAPI()

      if (apiData.length > daily.length) {
        const dbDates = new Set(daily.map((d) => d.date))
        const newFromApi = apiData.filter((d) => !dbDates.has(d.date))

        if (newFromApi.length > 0) {
          await saveToDatabase(newFromApi)
          // Filter merged data to requested date range
          daily = [...daily, ...newFromApi]
            .filter((d) => d.date >= startDate && d.date <= endDate)
            .sort((a, b) => a.date.localeCompare(b.date))
          source = 'mixed'
          console.log(`[About Analytics] Merged ${newFromApi.length} new rows from API, filtered to ${daily.length}`)
        }
      }
    }

    // Step 4: Always filter final result to requested date range (safety net)
    daily = daily.filter((d) => d.date >= startDate && d.date <= endDate)
    console.log(`[About Analytics] Final result: ${daily.length} rows for ${startDate} to ${endDate}`)

    if (daily.length === 0) {
      const response: AboutAnalyticsResponse = {
        daily: [],
        monthly: [],
        totals: { totalVisitors: 0, totalNewMembers: 0, avgConversionRate: 0, avgDailyVisitors: 0 },
        period: { range, startDate, endDate },
        source,
        sourceFilteringNote,
      }
      return NextResponse.json(response)
    }

    const monthly = aggregateMonthly(daily)

    const totalVisitors = daily.reduce((sum, d) => sum + d.visitors, 0)
    const avgDailyVisitors = daily.length > 0 ? totalVisitors / daily.length : 0

    // Get total new members for the period to calculate overall conversion rate
    const supabase = createServerClient()
    const { data: membersTotal } = await supabase
      .from('skool_members_daily')
      .select('new_members')
      .eq('group_slug', DEFAULT_GROUP.slug)
      .gte('date', startDate)
      .lte('date', endDate)

    const totalNewMembers = membersTotal?.reduce((sum, row) => sum + (row.new_members || 0), 0) || 0
    // Calculate overall conversion rate: total new members / total visitors
    const avgConversionRate = totalVisitors > 0
      ? (totalNewMembers / totalVisitors) * 100
      : 0

    console.log(`[About Analytics] Totals: ${totalVisitors} visitors, ${totalNewMembers} new members, ${avgConversionRate.toFixed(1)}% conversion`)

    const response: AboutAnalyticsResponse = {
      daily,
      monthly,
      totals: {
        totalVisitors,
        totalNewMembers,
        avgConversionRate: Math.round(avgConversionRate * 10) / 10,
        avgDailyVisitors: Math.round(avgDailyVisitors),
      },
      period: {
        range,
        startDate: daily[0]?.date || startDate,
        endDate: daily[daily.length - 1]?.date || endDate,
      },
      source,
      sourceFilteringNote,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[About Analytics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch about page analytics', details: String(error) },
      { status: 500 }
    )
  }
}
