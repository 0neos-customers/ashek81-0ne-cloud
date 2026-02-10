import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/skool/execution-log
 * List execution logs with pagination and optional filters
 *
 * Query params:
 * - limit: Number of records to return (default: 50, max: 100)
 * - offset: Number of records to skip (default: 0)
 * - status: Filter by status (success, failed, skipped)
 * - scheduler_id: Filter by scheduler UUID
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse pagination params with defaults and limits
    let limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Cap limit at 100 to prevent excessive queries
    if (limit > 100) limit = 100
    if (limit < 1) limit = 50

    // Optional filters
    const status = searchParams.get('status')
    const schedulerId = searchParams.get('scheduler_id')

    // Build query with joins to get scheduler and post details
    let query = supabase
      .from('skool_post_execution_log')
      .select(
        `
        *,
        scheduler:skool_scheduled_posts(category, day_of_week, time),
        post:skool_post_library(title)
      `,
        { count: 'exact' }
      )

    // Apply filters
    if (status) {
      // Validate status value
      const validStatuses = ['success', 'failed', 'skipped']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      query = query.eq('status', status)
    }

    if (schedulerId) {
      query = query.eq('scheduler_id', schedulerId)
    }

    // Apply ordering and pagination
    const { data, error, count } = await query
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[ExecutionLog API] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      logs: data,
      total: count,
      limit,
      offset,
      hasMore: count !== null && offset + limit < count,
    })
  } catch (error) {
    console.error('[ExecutionLog API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution logs', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skool/execution-log
 * Create a new execution log entry (typically called by the cron job)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    if (!body.status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = ['success', 'failed', 'skipped']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('skool_post_execution_log')
      .insert({
        scheduler_id: body.scheduler_id || null,
        post_library_id: body.post_library_id || null,
        status: body.status,
        skool_post_id: body.skool_post_id || null,
        skool_post_url: body.skool_post_url || null,
        error_message: body.error_message || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[ExecutionLog API] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ log: data }, { status: 201 })
  } catch (error) {
    console.error('[ExecutionLog API] POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to create execution log', details: String(error) },
      { status: 500 }
    )
  }
}
