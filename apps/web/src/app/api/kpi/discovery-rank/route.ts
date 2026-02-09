import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'

/**
 * GET /api/kpi/discovery-rank
 *
 * Returns discovery ranking history from skool_metrics table.
 * Data is collected daily via the sync-skool cron job.
 *
 * Query params:
 *   - startDate: Start of date range (YYYY-MM-DD)
 *   - endDate: End of date range (YYYY-MM-DD)
 *   If not provided, defaults to last 30 days.
 */
export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Use explicit dates if provided, otherwise default to last 30 days
    let startDate: string
    let endDate: string

    if (startDateParam && endDateParam) {
      startDate = startDateParam
      endDate = endDateParam
    } else {
      const now = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      startDate = thirtyDaysAgo.toISOString().split('T')[0]
      endDate = now.toISOString().split('T')[0]
    }

    const { data: metrics, error } = await supabase
      .from('skool_metrics')
      .select('snapshot_date, category_rank, category')
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: true })

    if (error) {
      console.error('[Discovery Rank API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch discovery rank data' },
        { status: 500 }
      )
    }

    // Transform to expected format
    const history = (metrics || [])
      .filter((m) => m.category_rank !== null)
      .map((m) => ({
        date: m.snapshot_date,
        rank: m.category_rank,
        category: m.category || undefined,
      }))

    // Get current (most recent) rank
    const current =
      history.length > 0
        ? {
            rank: history[history.length - 1].rank,
            category: history[history.length - 1].category || 'Unknown',
          }
        : null

    return NextResponse.json({
      current,
      history,
    })
  } catch (error) {
    console.error('[Discovery Rank API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
