/**
 * Last Runs API
 *
 * Returns the most recent sync run for each sync type.
 * Used by the Schedules tab to show last run status for each cron.
 *
 * GET /api/settings/sync-log/last-runs
 *   - Returns an object with sync_type as key and last run info as value
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import type { SyncType, SyncStatus } from '@/lib/sync-log'

export const dynamic = 'force-dynamic'

// All sync types we want to track
const SYNC_TYPES: SyncType[] = [
  'ghl_contacts',
  'ghl_payments',
  'skool',
  'skool_analytics',
  'skool_member_history',
  'skool_posts',
  'skool_dms',
  'skool_dms_outbound',
  'hand_raiser',
  'aggregate',
  'daily_snapshot',
  'meta',
]

interface LastRunInfo {
  startedAt: string
  status: SyncStatus
  recordsSynced: number
  durationSeconds: number | null
  errorMessage: string | null
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // For each sync type, get the most recent entry
    // We use a subquery to get distinct on sync_type ordered by started_at desc
    const { data, error } = await supabase
      .from('sync_activity_log')
      .select('*')
      .in('sync_type', SYNC_TYPES)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('[last-runs API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch last runs', details: error.message },
        { status: 500 }
      )
    }

    // Group by sync_type and take the first (most recent) entry for each
    const lastRunsMap: Record<SyncType, LastRunInfo | null> = {} as Record<SyncType, LastRunInfo | null>

    // Initialize all sync types with null
    for (const syncType of SYNC_TYPES) {
      lastRunsMap[syncType] = null
    }

    // Process results - first occurrence of each sync_type is the most recent
    const seenTypes = new Set<string>()
    for (const row of data || []) {
      const syncType = row.sync_type as SyncType
      if (!seenTypes.has(syncType)) {
        seenTypes.add(syncType)
        lastRunsMap[syncType] = {
          startedAt: row.started_at,
          status: row.status as SyncStatus,
          recordsSynced: row.records_synced,
          durationSeconds:
            row.completed_at && row.started_at
              ? Math.round(
                  (new Date(row.completed_at).getTime() -
                    new Date(row.started_at).getTime()) /
                    1000
                )
              : null,
          errorMessage: row.error_message,
        }
      }
    }

    return NextResponse.json({
      lastRuns: lastRunsMap,
    })
  } catch (error) {
    console.error('[last-runs API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
