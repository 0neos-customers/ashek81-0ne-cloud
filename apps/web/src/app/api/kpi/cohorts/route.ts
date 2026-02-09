import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'
import { COHORT_DAYS, type CohortDay } from '@/features/kpi/lib/config'

export const dynamic = 'force-dynamic'

interface CohortRow {
  cohort: string
  startDate: string
  initialLeads: number
  progression: Record<CohortDay, {
    leads: number
    epl: number
    ltv: number
  }>
}

// Get the week number for a date
function getWeekNumber(date: Date): string {
  const year = date.getFullYear()
  const firstDay = new Date(year, 0, 1)
  const dayOfYear = Math.floor((date.getTime() - firstDay.getTime()) / 86400000) + 1
  const weekNum = Math.ceil(dayOfYear / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

// Get start of week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || null
    // Support multiple sources via comma-separated string (attribution sources from skool_members)
    const sourcesParam = searchParams.get('sources')
    const sources = sourcesParam ? sourcesParam.split(',').filter(Boolean) : []
    const weeksBack = parseInt(searchParams.get('weeks') || '8')

    const supabase = createServerClient()

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - weeksBack * 7)

    // If sources filter is provided, get matching skool_user_ids from skool_members
    let skoolUserIds: string[] | null = null
    if (sources.length > 0) {
      // Query skool_members to get user IDs with matching attribution sources
      // Note: 'unknown' source means attribution_source IS NULL
      const hasUnknown = sources.includes('unknown')
      const otherSources = sources.filter(s => s !== 'unknown')

      let skoolQuery = supabase
        .from('skool_members')
        .select('skool_user_id')

      if (hasUnknown && otherSources.length > 0) {
        // Both unknown (NULL) and specific sources
        skoolQuery = skoolQuery.or(`attribution_source.in.(${otherSources.join(',')}),attribution_source.is.null`)
      } else if (hasUnknown) {
        // Only unknown (NULL)
        skoolQuery = skoolQuery.is('attribution_source', null)
      } else {
        // Only specific sources
        skoolQuery = skoolQuery.in('attribution_source', otherSources)
      }

      const { data: skoolMembers } = await skoolQuery
      skoolUserIds = skoolMembers?.map(m => m.skool_user_id).filter(Boolean) || []
    }

    // Get contacts created in the range
    let contactsQuery = supabase
      .from('contacts')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Apply source filter via skool_user_id join (new attribution-based filtering)
    if (skoolUserIds !== null) {
      if (skoolUserIds.length === 0) {
        // No matching skool members, return empty cohorts
        return NextResponse.json({
          cohorts: [],
          overallMetrics: {
            totalLeads: 0,
            averageEpl: 0,
            averageLtv: 0,
            cohortDays: COHORT_DAYS,
          },
          filters: { sources: [], weeksOptions: [4, 8, 12, 16, 24] },
          meta: {
            weeksIncluded: weeksBack,
            startDate: startDate.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0],
          },
          sourceFilteringNote: 'No contacts found matching the selected attribution sources.',
        })
      }
      contactsQuery = contactsQuery.in('skool_user_id', skoolUserIds)
    } else if (source) {
      // Legacy single source filter (deprecated, uses contacts.source)
      contactsQuery = contactsQuery.eq('source', source)
    }

    const { data: contacts } = await contactsQuery

    // Get cohort snapshots if available
    const { data: cohortSnapshots } = await supabase
      .from('cohort_snapshots')
      .select('*')
      .gte('snapshot_date', startDate.toISOString())
      .order('snapshot_date', { ascending: true })

    // Group contacts by week cohort
    const cohortMap = new Map<string, {
      startDate: Date
      contacts: typeof contacts
    }>()

    contacts?.forEach((contact) => {
      const createdAt = new Date(contact.created_at)
      const weekKey = getWeekNumber(createdAt)
      const weekStart = getWeekStart(createdAt)

      if (!cohortMap.has(weekKey)) {
        cohortMap.set(weekKey, {
          startDate: weekStart,
          contacts: [],
        })
      }
      cohortMap.get(weekKey)!.contacts!.push(contact)
    })

    // Build cohort progression data
    const cohorts: CohortRow[] = []

    for (const [weekKey, cohortData] of cohortMap) {
      const cohortContacts = cohortData.contacts || []
      const cohortStartDate = cohortData.startDate

      // Calculate progression for each milestone day
      const progression: CohortRow['progression'] = {} as CohortRow['progression']

      for (const day of COHORT_DAYS) {
        // For each day milestone, count how many leads have reached that age
        const milestoneDate = new Date(cohortStartDate)
        milestoneDate.setDate(milestoneDate.getDate() + day)

        // If milestone is in the future, we don't have data yet
        if (milestoneDate > now) {
          break
        }

        // Count leads that have aged to this point
        const eligibleContacts = cohortContacts.filter((c) => {
          const leadAge = c.lead_age || 0
          return leadAge >= day
        })

        // Get average EPL and LTV for this cohort at this day
        // Note: In a real implementation, you'd query cohort_snapshots
        // or calculate from events/revenue tables
        let totalEpl = 0
        let totalLtv = 0

        // For now, use placeholder calculation based on lead_age
        // In production, this would pull from snapshot data or calculate from revenue
        const avgEpl = eligibleContacts.length > 0 ? 0 : 0 // Placeholder
        const avgLtv = eligibleContacts.length > 0 ? 0 : 0 // Placeholder

        progression[day] = {
          leads: eligibleContacts.length,
          epl: avgEpl,
          ltv: avgLtv,
        }
      }

      cohorts.push({
        cohort: weekKey,
        startDate: cohortStartDate.toISOString().split('T')[0],
        initialLeads: cohortContacts.length,
        progression,
      })
    }

    // Sort cohorts by date (newest first)
    cohorts.sort((a, b) => b.startDate.localeCompare(a.startDate))

    // Calculate overall EPL/LTV averages across all cohorts
    const overallMetrics = {
      totalLeads: contacts?.length || 0,
      averageEpl: 0, // Would calculate from real data
      averageLtv: 0, // Would calculate from real data
      cohortDays: COHORT_DAYS,
    }

    // Get available sources for filtering
    const sourceSet = new Set<string>()
    contacts?.forEach((c) => {
      if (c.source) sourceSet.add(c.source)
    })

    const response = {
      cohorts,
      overallMetrics,
      filters: {
        sources: Array.from(sourceSet).map((s) => ({ name: s })),
        weeksOptions: [4, 8, 12, 16, 24],
      },
      meta: {
        weeksIncluded: weeksBack,
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('KPI Cohorts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cohort data', details: String(error) },
      { status: 500 }
    )
  }
}
