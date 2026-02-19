import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/dm-sync/contacts/[skoolUserId]
 * Update contact fields: ghl_contact_id, email, phone, display_name, username
 */

interface ContactUpdate {
  ghl_contact_id?: string
  email?: string
  phone?: string
  display_name?: string
  username?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ skoolUserId: string }> }
) {
  try {
    const { skoolUserId } = await params
    const body: ContactUpdate = await request.json()

    const supabase = createServerClient()
    const now = new Date().toISOString()

    // Build mapping update (dm_contact_mappings)
    const mappingUpdate: Record<string, unknown> = { updated_at: now }
    // Build member update (skool_members)
    const memberUpdate: Record<string, unknown> = {}

    if (body.ghl_contact_id !== undefined) {
      const ghlId = body.ghl_contact_id.trim()
      if (!ghlId) {
        return NextResponse.json({ error: 'ghl_contact_id cannot be empty' }, { status: 400 })
      }
      mappingUpdate.ghl_contact_id = ghlId
      mappingUpdate.match_method = 'manual'
      memberUpdate.ghl_contact_id = ghlId
      memberUpdate.matched_at = now
      memberUpdate.match_method = 'manual'
    }

    if (body.email !== undefined) {
      mappingUpdate.email = body.email.trim() || null
      memberUpdate.email = body.email.trim() || null
    }

    if (body.phone !== undefined) {
      mappingUpdate.phone = body.phone.trim() || null
      memberUpdate.phone = body.phone.trim() || null
    }

    if (body.display_name !== undefined) {
      mappingUpdate.skool_display_name = body.display_name.trim() || null
      memberUpdate.display_name = body.display_name.trim() || null
    }

    if (body.username !== undefined) {
      mappingUpdate.skool_username = body.username.trim() || null
      memberUpdate.skool_username = body.username.trim() || null
    }

    // Only proceed if there's something to update
    if (Object.keys(mappingUpdate).length <= 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update dm_contact_mappings
    const { error: mappingError } = await supabase
      .from('dm_contact_mappings')
      .update(mappingUpdate)
      .eq('skool_user_id', skoolUserId)

    if (mappingError) {
      console.error('[Contacts API] PATCH mapping error:', mappingError)
      return NextResponse.json({ error: mappingError.message }, { status: 500 })
    }

    // Also update skool_members if there are member fields
    if (Object.keys(memberUpdate).length > 0) {
      await supabase
        .from('skool_members')
        .update(memberUpdate)
        .eq('skool_user_id', skoolUserId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Contacts API] PATCH exception:', error)
    return NextResponse.json(
      { error: 'Failed to update contact', details: String(error) },
      { status: 500 }
    )
  }
}
