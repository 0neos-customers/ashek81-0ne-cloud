import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import type { SkoolScheduledPostInput } from '@0ne/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/skool/schedulers
 * List all scheduler slots, ordered by day and time
 * Includes variation group data if available
 */
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('skool_scheduled_posts')
      .select('*, variation_group:skool_variation_groups(id, name, is_active)')
      .order('day_of_week')
      .order('time')

    if (error) {
      console.error('[Schedulers API] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedulers: data })
  } catch (error) {
    console.error('[Schedulers API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedulers', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skool/schedulers
 * Create a new scheduler slot
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body: SkoolScheduledPostInput = await request.json()

    // Validate required fields
    if (!body.category || body.day_of_week === undefined || !body.time) {
      return NextResponse.json(
        { error: 'Missing required fields: category, day_of_week, time' },
        { status: 400 }
      )
    }

    // Validate day_of_week range (0-6)
    if (body.day_of_week < 0 || body.day_of_week > 6) {
      return NextResponse.json(
        { error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      )
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(body.time)) {
      return NextResponse.json(
        { error: 'time must be in HH:MM format (e.g., "09:00")' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('skool_scheduled_posts')
      .insert({
        group_slug: body.group_slug || 'fruitful',
        category: body.category,
        category_id: body.category_id || null,
        day_of_week: body.day_of_week,
        time: body.time,
        variation_group_id: body.variation_group_id || null,
        is_active: body.is_active ?? true,
        note: body.note || null,
      })
      .select('*, variation_group:skool_variation_groups(id, name, is_active)')
      .single()

    if (error) {
      console.error('[Schedulers API] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scheduler: data }, { status: 201 })
  } catch (error) {
    console.error('[Schedulers API] POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to create scheduler', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/skool/schedulers
 * Update an existing scheduler slot
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Validate day_of_week if provided
    if (updates.day_of_week !== undefined) {
      if (updates.day_of_week < 0 || updates.day_of_week > 6) {
        return NextResponse.json(
          { error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' },
          { status: 400 }
        )
      }
    }

    // Validate time format if provided
    if (updates.time && !/^\d{2}:\d{2}$/.test(updates.time)) {
      return NextResponse.json(
        { error: 'time must be in HH:MM format (e.g., "09:00")' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('skool_scheduled_posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, variation_group:skool_variation_groups(id, name, is_active)')
      .single()

    if (error) {
      console.error('[Schedulers API] PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Scheduler not found' }, { status: 404 })
    }

    return NextResponse.json({ scheduler: data })
  } catch (error) {
    console.error('[Schedulers API] PUT exception:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduler', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/skool/schedulers?id=xxx
 * Delete a scheduler slot
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 })
    }

    const { error } = await supabase
      .from('skool_scheduled_posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Schedulers API] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Schedulers API] DELETE exception:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduler', details: String(error) },
      { status: 500 }
    )
  }
}
