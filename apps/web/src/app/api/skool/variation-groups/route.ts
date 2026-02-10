import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import type { SkoolVariationGroupInput } from '@0ne/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/skool/variation-groups
 * List all variation groups with optional post counts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('include_stats') === 'true'

    const { data, error } = await supabase
      .from('skool_variation_groups')
      .select('*')
      .order('name')

    if (error) {
      console.error('[Variation Groups API] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally include post counts for each group
    let groupsWithStats = data
    if (includeStats && data) {
      const groupIds = data.map((g) => g.id)

      // Get post counts
      const { data: postCounts } = await supabase
        .from('skool_post_library')
        .select('variation_group_id')
        .in('variation_group_id', groupIds)
        .eq('is_active', true)

      // Get scheduler counts
      const { data: schedulerCounts } = await supabase
        .from('skool_scheduled_posts')
        .select('variation_group_id')
        .in('variation_group_id', groupIds)
        .eq('is_active', true)

      // Aggregate counts
      const postCountMap = new Map<string, number>()
      const schedulerCountMap = new Map<string, number>()

      postCounts?.forEach((p) => {
        if (p.variation_group_id) {
          postCountMap.set(p.variation_group_id, (postCountMap.get(p.variation_group_id) || 0) + 1)
        }
      })

      schedulerCounts?.forEach((s) => {
        if (s.variation_group_id) {
          schedulerCountMap.set(
            s.variation_group_id,
            (schedulerCountMap.get(s.variation_group_id) || 0) + 1
          )
        }
      })

      groupsWithStats = data.map((group) => ({
        ...group,
        post_count: postCountMap.get(group.id) || 0,
        scheduler_count: schedulerCountMap.get(group.id) || 0,
      }))
    }

    return NextResponse.json({ groups: groupsWithStats })
  } catch (error) {
    console.error('[Variation Groups API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch variation groups', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skool/variation-groups
 * Create a new variation group
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body: SkoolVariationGroupInput = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('skool_variation_groups')
      .insert({
        name: body.name,
        description: body.description || null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Variation Groups API] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ group: data }, { status: 201 })
  } catch (error) {
    console.error('[Variation Groups API] POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to create variation group', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/skool/variation-groups
 * Update an existing variation group
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('skool_variation_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Variation Groups API] PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Variation group not found' }, { status: 404 })
    }

    return NextResponse.json({ group: data })
  } catch (error) {
    console.error('[Variation Groups API] PUT exception:', error)
    return NextResponse.json(
      { error: 'Failed to update variation group', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/skool/variation-groups?id=xxx
 * Delete a variation group (will unlink posts and schedulers)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 })
    }

    // Note: Posts and schedulers will have their variation_group_id set to null
    // due to the ON DELETE SET NULL behavior (if configured) or we handle it here
    const { error } = await supabase.from('skool_variation_groups').delete().eq('id', id)

    if (error) {
      console.error('[Variation Groups API] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Variation Groups API] DELETE exception:', error)
    return NextResponse.json(
      { error: 'Failed to delete variation group', details: String(error) },
      { status: 500 }
    )
  }
}
