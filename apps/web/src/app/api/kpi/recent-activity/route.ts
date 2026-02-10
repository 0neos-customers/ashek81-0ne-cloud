import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'
import { STAGE_LABELS } from '@/features/kpi/lib/config'

export const dynamic = 'force-dynamic'

export interface RecentActivityItem {
  id: string
  name: string
  action: string
  stage: string
  source: string | null
  timestamp: string
  timeAgo: string
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const supabase = createServerClient()

    // Query recent stage change events with contact details
    // Join events with contacts to get name and source
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        event_type,
        event_data,
        source,
        created_at,
        contact:contacts!contact_id (
          id,
          first_name,
          last_name,
          source
        )
      `)
      .eq('event_type', 'stage_changed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Recent activity query error:', error)
      // Fallback: query contacts table directly for recent updates
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, current_stage, source, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (contactsError) {
        throw contactsError
      }

      const activity: RecentActivityItem[] = (contacts || []).map((contact) => {
        const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown'
        const stageLabel = STAGE_LABELS[contact.current_stage as keyof typeof STAGE_LABELS] || contact.current_stage
        const timestamp = new Date(contact.updated_at)

        return {
          id: contact.id,
          name,
          action: `Moved to ${stageLabel}`,
          stage: contact.current_stage,
          source: contact.source,
          timestamp: contact.updated_at,
          timeAgo: getTimeAgo(timestamp),
        }
      })

      return NextResponse.json({ activity })
    }

    // Process events into activity items
    type ContactData = { id: string; first_name: string | null; last_name: string | null; source: string | null }
    const activity: RecentActivityItem[] = (events || []).map((event) => {
      // Supabase join returns the related contact object directly (not an array for 1-to-1 relationships)
      const contactData = event.contact as ContactData | ContactData[] | null
      const contact = Array.isArray(contactData) ? contactData[0] : contactData
      const name = contact
        ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown'
        : 'Unknown'

      const eventData = event.event_data as { new_stage?: string; old_stage?: string } | null
      const newStage = eventData?.new_stage || 'unknown'
      const stageLabel = STAGE_LABELS[newStage as keyof typeof STAGE_LABELS] || newStage
      const timestamp = new Date(event.created_at)

      return {
        id: event.id,
        name,
        action: `Moved to ${stageLabel}`,
        stage: newStage,
        source: event.source || contact?.source || null,
        timestamp: event.created_at,
        timeAgo: getTimeAgo(timestamp),
      }
    })

    return NextResponse.json({ activity })
  } catch (error) {
    console.error('Recent activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity', details: String(error) },
      { status: 500 }
    )
  }
}
