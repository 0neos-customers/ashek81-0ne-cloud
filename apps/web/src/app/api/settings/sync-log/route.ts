/**
 * Sync Log API
 *
 * Provides access to the unified sync activity log for monitoring
 * all data sync jobs in the system.
 *
 * GET /api/settings/sync-log
 *   - Returns recent sync activity (default: last 100 entries)
 *   - Query params:
 *     - type: Filter by sync_type (e.g., 'ghl_contacts', 'skool', 'meta')
 *     - limit: Number of entries to return (default: 100, max: 500)
 *     - status: Filter by status ('running', 'completed', 'failed')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import type { SyncType, SyncStatus } from '@/lib/sync-log'

export const dynamic = 'force-dynamic'

// Valid sync types for filtering
const VALID_SYNC_TYPES: SyncType[] = [
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

// Valid statuses for filtering
const VALID_STATUSES: SyncStatus[] = ['running', 'completed', 'failed']

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const typeFilter = searchParams.get('type')
    const statusFilter = searchParams.get('status')
    const limitParam = parseInt(searchParams.get('limit') || '100', 10)

    // Validate and cap limit
    const limit = Math.min(Math.max(1, limitParam), 500)

    // Validate type filter if provided
    if (typeFilter && !VALID_SYNC_TYPES.includes(typeFilter as SyncType)) {
      return NextResponse.json(
        {
          error: 'Invalid sync type',
          validTypes: VALID_SYNC_TYPES,
        },
        { status: 400 }
      )
    }

    // Validate status filter if provided
    if (statusFilter && !VALID_STATUSES.includes(statusFilter as SyncStatus)) {
      return NextResponse.json(
        {
          error: 'Invalid status',
          validStatuses: VALID_STATUSES,
        },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('sync_activity_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    // Apply type filter if provided
    if (typeFilter) {
      query = query.eq('sync_type', typeFilter)
    }

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('[sync-log API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sync logs', details: error.message },
        { status: 500 }
      )
    }

    // Transform data for response
    const logs = (data || []).map((log) => ({
      id: log.id,
      syncType: log.sync_type,
      startedAt: log.started_at,
      completedAt: log.completed_at,
      recordsSynced: log.records_synced,
      status: log.status,
      errorMessage: log.error_message,
      metadata: log.metadata,
      // Calculate duration if completed
      durationSeconds: log.completed_at && log.started_at
        ? Math.round(
            (new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000
          )
        : null,
    }))

    // Get summary stats
    const summary = {
      total: logs.length,
      running: logs.filter((l) => l.status === 'running').length,
      completed: logs.filter((l) => l.status === 'completed').length,
      failed: logs.filter((l) => l.status === 'failed').length,
    }

    return NextResponse.json({
      logs,
      summary,
      filters: {
        type: typeFilter,
        status: statusFilter,
        limit,
      },
    })
  } catch (error) {
    console.error('[sync-log API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
