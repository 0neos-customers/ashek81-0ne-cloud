import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import type { SkoolCampaignInput } from '@0ne/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/skool/campaigns
 * List all campaigns with optional post stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('include_stats') === 'true'
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = supabase.from('skool_campaigns').select('*').order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Campaigns API] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally include post stats for each campaign
    let campaignsWithStats = data
    if (includeStats && data) {
      const campaignIds = data.map((c) => c.id)

      // Get posts for each campaign
      const { data: posts } = await supabase
        .from('skool_oneoff_posts')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds)

      // Aggregate stats
      const statsMap = new Map<
        string,
        { total: number; pending: number; published: number; failed: number }
      >()

      posts?.forEach((p) => {
        if (!p.campaign_id) return
        const existing = statsMap.get(p.campaign_id) || {
          total: 0,
          pending: 0,
          published: 0,
          failed: 0,
        }
        existing.total++
        if (p.status === 'pending' || p.status === 'draft') existing.pending++
        if (p.status === 'published' || p.status === 'posted_manually') existing.published++
        if (p.status === 'failed') existing.failed++
        statsMap.set(p.campaign_id, existing)
      })

      campaignsWithStats = data.map((campaign) => ({
        ...campaign,
        stats: statsMap.get(campaign.id) || { total: 0, pending: 0, published: 0, failed: 0 },
      }))
    }

    return NextResponse.json({ campaigns: campaignsWithStats })
  } catch (error) {
    console.error('[Campaigns API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skool/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body: SkoolCampaignInput = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('skool_campaigns')
      .insert({
        name: body.name,
        description: body.description || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Campaigns API] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (error) {
    console.error('[Campaigns API] POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/skool/campaigns
 * Update an existing campaign
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
      .from('skool_campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Campaigns API] PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign: data })
  } catch (error) {
    console.error('[Campaigns API] PUT exception:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/skool/campaigns?id=xxx
 * Delete a campaign (posts will have campaign_id set to null)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 })
    }

    const { error } = await supabase.from('skool_campaigns').delete().eq('id', id)

    if (error) {
      console.error('[Campaigns API] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Campaigns API] DELETE exception:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign', details: String(error) },
      { status: 500 }
    )
  }
}
