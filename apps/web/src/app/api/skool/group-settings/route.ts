import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import type { EmailBlastStatus } from '@0ne/db'

export const dynamic = 'force-dynamic'

const COOLDOWN_HOURS = 72

/**
 * GET /api/skool/group-settings
 * Get group settings including email blast status
 *
 * Query params:
 * - group_slug: The group to get settings for (default: 'fruitful')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const groupSlug = searchParams.get('group_slug') || 'fruitful'

    const { data, error } = await supabase
      .from('skool_group_settings')
      .select('*')
      .eq('group_slug', groupSlug)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('[Group Settings API] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate email blast status
    const lastBlastAt = data?.last_email_blast_at ? new Date(data.last_email_blast_at) : null
    let available = true
    let hoursUntilAvailable = 0

    if (lastBlastAt) {
      const cooldownEnd = new Date(lastBlastAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000)
      const now = new Date()

      if (now < cooldownEnd) {
        available = false
        hoursUntilAvailable = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (60 * 60 * 1000))
      }
    }

    const emailBlastStatus: EmailBlastStatus = {
      available,
      hours_until_available: hoursUntilAvailable,
      last_blast_at: data?.last_email_blast_at || null,
    }

    return NextResponse.json({
      settings: data || { group_slug: groupSlug, last_email_blast_at: null },
      email_blast_status: emailBlastStatus,
    })
  } catch (error) {
    console.error('[Group Settings API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group settings', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skool/group-settings/record-blast
 * Record that an email blast was sent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const groupSlug = body.group_slug || 'fruitful'

    // Upsert the group settings with the new blast time
    const { data, error } = await supabase
      .from('skool_group_settings')
      .upsert(
        {
          group_slug: groupSlug,
          last_email_blast_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'group_slug' }
      )
      .select()
      .single()

    if (error) {
      console.error('[Group Settings API] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('[Group Settings API] POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to record email blast', details: String(error) },
      { status: 500 }
    )
  }
}
