/**
 * Member History Sync Cron Endpoint
 *
 * Syncs historical member counts from Skool for date-filtered reporting.
 *
 * Usage:
 *   # Daily sync (monthly + daily API data)
 *   curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-member-history"
 *
 *   # Full backfill (includes interpolating historical daily data)
 *   curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-member-history?backfill=true"
 *
 *   # Check data without syncing
 *   curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-member-history?stats=true"
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import {
  syncMemberHistory,
  getMemberCountForPeriod,
} from '@/features/skool/lib/members-history-sync'
import { syncCommunityActivity } from '@/features/skool/lib/community-activity-sync'
import { DEFAULT_GROUP } from '@/features/skool/lib/config'
import { SyncLogger } from '@/lib/sync-log'

export const maxDuration = 300 // 5 minutes max for backfill

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group') || DEFAULT_GROUP.slug
  const statsOnly = searchParams.get('stats') === 'true'
  const runBackfill = searchParams.get('backfill') === 'true'

  try {
    const supabase = createServerClient()

    // Stats only mode
    if (statsOnly) {
      // Get counts from database
      const { count: monthlyCount } = await supabase
        .from('skool_members_monthly')
        .select('*', { count: 'exact', head: true })
        .eq('group_slug', group)

      const { count: dailyCount } = await supabase
        .from('skool_members_daily')
        .select('*', { count: 'exact', head: true })
        .eq('group_slug', group)

      const { count: apiDailyCount } = await supabase
        .from('skool_members_daily')
        .select('*', { count: 'exact', head: true })
        .eq('group_slug', group)
        .eq('source', 'skool_api')

      const { count: interpolatedCount } = await supabase
        .from('skool_members_daily')
        .select('*', { count: 'exact', head: true })
        .eq('group_slug', group)
        .eq('source', 'interpolated')

      // Get date range
      const { data: dateRange } = await supabase
        .from('skool_members_daily')
        .select('date')
        .eq('group_slug', group)
        .order('date', { ascending: true })

      const firstDate = dateRange?.[0]?.date
      const lastDate = dateRange?.[dateRange.length - 1]?.date

      // Get MTD stats
      const now = new Date()
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const mtdEnd = now.toISOString().split('T')[0]

      const mtdStats = await getMemberCountForPeriod(group, mtdStart, mtdEnd)

      return NextResponse.json({
        group,
        counts: {
          monthly: monthlyCount,
          daily: dailyCount,
          dailyFromApi: apiDailyCount,
          dailyInterpolated: interpolatedCount,
        },
        dateRange: {
          first: firstDate,
          last: lastDate,
        },
        mtd: mtdStats,
      })
    }

    // Run sync
    console.log(`[Member History Cron] Starting sync for ${group}...`)
    const startTime = Date.now()

    // Start sync logging
    const syncLog = new SyncLogger('skool_member_history')
    await syncLog.start({ group, backfill: runBackfill })

    try {
      // Sync member history
      const memberResult = await syncMemberHistory(group, {
        skipBackfill: !runBackfill,
      })

      // Sync community activity (always full backfill since it's a single API call)
      console.log(`[Member History Cron] Syncing community activity...`)
      const activityResult = await syncCommunityActivity(group)

      const duration = Date.now() - startTime

      // Calculate total records synced
      const recordsSynced = (memberResult.monthly?.synced || 0) + (memberResult.daily?.synced || 0) + (activityResult.synced || 0)

      // Complete sync logging
      await syncLog.complete(recordsSynced, {
        members: memberResult,
        activity: activityResult,
      })

      return NextResponse.json({
        success: true,
        group,
        duration: `${duration}ms`,
        results: {
          members: memberResult,
          communityActivity: activityResult,
        },
        message: runBackfill
          ? 'Full sync with backfill complete'
          : 'Daily sync complete (use ?backfill=true for full historical backfill)',
      })
    } catch (innerError) {
      await syncLog.fail(String(innerError))
      throw innerError
    }
  } catch (error) {
    console.error('[Member History Cron] Error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}
