import { NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import { getSkoolClient } from '@/features/skool/lib/skool-client'
import { DEFAULT_GROUP } from '@/features/skool/lib/config'
import { SyncLogger } from '@/lib/sync-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

/**
 * CRON: Sync About Page Daily Analytics
 *
 * Fetches about page visitor and conversion data from Skool API
 * and stores it in our database for historical tracking.
 *
 * Schedule: Daily at 5:30am EST (after sync-skool at 5am)
 *
 * Usage:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     "http://localhost:3000/api/cron/sync-about-analytics"
 *
 * Options:
 *   ?backfill=true  - Fetch all historical data (use for initial setup)
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const backfill = searchParams.get('backfill') === 'true'

  console.log(`[Sync About Analytics] Starting sync (backfill=${backfill})`)

  // Start sync logging
  const syncLog = new SyncLogger('skool_analytics')
  await syncLog.start({ backfill })

  try {
    const supabase = createServerClient()
    const skool = getSkoolClient()
    const groupSlug = DEFAULT_GROUP.slug

    // Determine range: backfill gets all data, normal gets last 30 days
    const rangeParam = backfill ? 'all' : '30'

    // Fetch from Skool API
    const url = `https://api2.skool.com/groups/${groupSlug}/analytics?chart=conversion_about_by_day&range=${rangeParam}`
    console.log(`[Sync About Analytics] Fetching: ${url}`)

    const response = await skool.fetchWithAuth(url)

    if (!response.ok) {
      console.error(`[Sync About Analytics] Skool API failed: ${response.status}`)
      await syncLog.fail(`Skool API failed: ${response.status}`)
      return NextResponse.json(
        { error: 'Skool API failed', status: response.status },
        { status: 502 }
      )
    }

    const data: AnalyticsChartResponse = await response.json()
    const items = data?.chart_data?.items || []

    console.log(`[Sync About Analytics] Got ${items.length} data points`)

    if (items.length === 0) {
      await syncLog.complete(0)
      return NextResponse.json({
        success: true,
        message: 'No data returned from Skool',
        synced: 0,
        duration: Date.now() - startTime,
      })
    }

    // Log date range
    console.log(`[Sync About Analytics] Date range: ${items[0]?.date} to ${items[items.length - 1]?.date}`)

    // Transform to DB format
    const rows = items.map((item) => ({
      group_slug: groupSlug,
      date: item.date,
      visitors: item.page_visits || item.value || 0,
      conversion_rate: item.conversion_rate ? item.conversion_rate * 100 : null,
    }))

    // Upsert to database
    const { error: upsertError } = await supabase
      .from('skool_about_page_daily')
      .upsert(rows, { onConflict: 'group_slug,date' })

    if (upsertError) {
      console.error('[Sync About Analytics] DB upsert error:', upsertError)
      await syncLog.fail(`Database error: ${upsertError.message}`)
      return NextResponse.json(
        { error: 'Database error', details: upsertError.message },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`[Sync About Analytics] Synced ${rows.length} rows in ${duration}ms`)

    // Complete sync logging
    await syncLog.complete(rows.length, {
      dateRange: {
        from: items[0]?.date,
        to: items[items.length - 1]?.date,
      },
    })

    return NextResponse.json({
      success: true,
      synced: rows.length,
      dateRange: {
        from: items[0]?.date,
        to: items[items.length - 1]?.date,
      },
      duration,
    })
  } catch (error) {
    console.error('[Sync About Analytics] Error:', error)
    await syncLog.fail(String(error))
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}
