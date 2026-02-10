import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/skool/variation-groups/[id]
 * Get a single variation group by ID with stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('skool_variation_groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Variation group not found' }, { status: 404 })
      }
      console.error('[Variation Groups API] GET by ID error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get post count
    const { count: postCount } = await supabase
      .from('skool_post_library')
      .select('*', { count: 'exact', head: true })
      .eq('variation_group_id', id)

    // Get scheduler count
    const { count: schedulerCount } = await supabase
      .from('skool_scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('variation_group_id', id)

    const groupWithStats = {
      ...data,
      post_count: postCount || 0,
      scheduler_count: schedulerCount || 0,
    }

    return NextResponse.json({ group: groupWithStats })
  } catch (error) {
    console.error('[Variation Groups API] GET by ID exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch variation group', details: String(error) },
      { status: 500 }
    )
  }
}
