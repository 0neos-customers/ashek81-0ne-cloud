/**
 * Skool Member Sync
 *
 * Syncs Skool members to Supabase and matches them to GHL contacts.
 */

import { createServerClient } from '@0ne/db/server'
import { getSkoolClient } from './skool-client'
import { DEFAULT_GROUP } from './config'
import type { SkoolApiMember, MemberSyncResult, SkoolMemberRow } from '../types'

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================

/**
 * Sync all Skool members to the database
 *
 * 1. Fetches all active members from Skool API
 * 2. Upserts to skool_members table
 * 3. Matches to GHL contacts by name
 * 4. Updates contacts.skool_user_id for matches
 */
export async function syncSkoolMembers(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<MemberSyncResult> {
  const supabase = createServerClient()
  const skool = getSkoolClient()

  const stats = {
    total: 0,
    inserted: 0,
    updated: 0,
    matched: 0,
    errors: 0,
  }
  const errors: string[] = []

  console.log(`[Skool Sync] Starting member sync for group: ${groupSlug}`)

  try {
    // Clear buildId cache to ensure fresh fetch
    skool.clearCache()

    // 1. Fetch all active members from Skool
    // Note: Churned/banned members get 403 - GHL matching relies on active members
    console.log('[Skool Sync] Fetching active members from Skool API...')
    const members = await skool.getMembers(groupSlug, { tab: 'active' })
    stats.total = members.length
    console.log(`[Skool Sync] Fetched ${members.length} active members`)

    if (members.length === 0) {
      return { success: true, stats }
    }

    // 2. Deduplicate members by ID (API may return duplicates across pages)
    const uniqueMembers = new Map<string, typeof members[0]>()
    for (const member of members) {
      if (!uniqueMembers.has(member.id)) {
        uniqueMembers.set(member.id, member)
      }
    }
    const deduplicatedMembers = Array.from(uniqueMembers.values())

    if (deduplicatedMembers.length < members.length) {
      console.log(
        `[Skool Sync] Deduplicated ${members.length} → ${deduplicatedMembers.length} members`
      )
    }

    // Count members with email by source
    let emailFromMbme = 0
    let emailFromDirect = 0
    let emailFromSurvey = 0
    for (const m of deduplicatedMembers) {
      if (m.member?.metadata?.mbme || m.metadata?.mbme) {
        emailFromMbme++
      } else if (m.email) {
        emailFromDirect++
      } else {
        // Check survey data (can be JSON string or array)
        const surveyRaw = m.member?.metadata?.survey
        let surveyAnswers: Array<{ answer?: string; value?: string; type?: string }> = []

        if (typeof surveyRaw === 'string') {
          try {
            const parsed = JSON.parse(surveyRaw)
            if (parsed?.survey && Array.isArray(parsed.survey)) {
              surveyAnswers = parsed.survey
            } else if (Array.isArray(parsed)) {
              surveyAnswers = parsed
            }
          } catch {
            // Ignore parse errors
          }
        } else if (Array.isArray(surveyRaw)) {
          surveyAnswers = surveyRaw as typeof surveyAnswers
        }

        const hasEmailInSurvey = surveyAnswers.some((a) => {
          const answer = a.answer || a.value || ''
          return a.type === 'email' || (answer.includes('@') && answer.includes('.'))
        })
        if (hasEmailInSurvey) emailFromSurvey++
      }
    }
    const withEmail = emailFromMbme + emailFromDirect + emailFromSurvey
    console.log(
      `[Skool Sync] ${withEmail} members have email addresses (mbme: ${emailFromMbme}, direct: ${emailFromDirect}, survey: ${emailFromSurvey})`
    )

    // 3. Prepare members for upsert
    const memberRows = deduplicatedMembers.map((m) => transformMemberToRow(m, groupSlug))
    stats.total = memberRows.length

    // 3. Upsert in batches to avoid hitting request limits
    const BATCH_SIZE = 100
    for (let i = 0; i < memberRows.length; i += BATCH_SIZE) {
      const batch = memberRows.slice(i, i + BATCH_SIZE)

      const { error: upsertError, data: upsertedData } = await supabase
        .from('skool_members')
        .upsert(batch, {
          onConflict: 'skool_user_id',
          ignoreDuplicates: false,
        })
        .select('id, skool_user_id')

      if (upsertError) {
        console.error(`[Skool Sync] Upsert error for batch ${i}:`, upsertError)
        stats.errors += batch.length
        errors.push(`Batch ${i}: ${upsertError.message}`)
      } else {
        // Count as updated (upsert doesn't distinguish insert vs update)
        stats.updated += upsertedData?.length || batch.length
      }
    }

    // Adjust stats: everything upserted is either insert or update
    stats.inserted = stats.total - stats.errors

    // 4. Match to GHL contacts
    console.log('[Skool Sync] Matching to GHL contacts...')
    const matchResult = await matchMembersToContacts(supabase, groupSlug)
    stats.matched = matchResult.matched

    console.log(
      `[Skool Sync] Complete. Total: ${stats.total}, Upserted: ${stats.updated}, Matched: ${stats.matched}, Errors: ${stats.errors}`
    )

    return {
      success: stats.errors === 0,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Skool Sync] Fatal error:', message)
    errors.push(message)
    return { success: false, stats, errors }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract email from Skool member data
 *
 * Email can be in several locations (checked in priority order):
 * 1. member.metadata.mbme (nested member object - primary)
 * 2. metadata.mbme (top-level metadata)
 * 3. member.inviteEmail (admin-invited members bypass survey)
 * 4. email (direct field)
 * 5. Survey answers (member.metadata.survey) - can contain email responses!
 *
 * Skoot uses the same logic: member?.metadata?.mbme || email || surveyEmail
 */
function extractMemberEmail(member: SkoolApiMember): string | null {
  // Try nested member.metadata.mbme first (most common)
  if (member.member?.metadata?.mbme) {
    return member.member.metadata.mbme
  }

  // Try top-level metadata.mbme
  if (member.metadata?.mbme) {
    return member.metadata.mbme
  }

  // Try member.inviteEmail (admin-invited members bypass survey questions)
  if (member.member?.inviteEmail) {
    return member.member.inviteEmail
  }

  // Try direct email field
  if (member.email) {
    return member.email
  }

  // Try survey answers - look for email type or answers containing @
  // Survey data can be a JSON string or already parsed
  const surveyRaw = member.member?.metadata?.survey
  let surveyAnswers: Array<{ question?: string; label?: string; answer?: string; value?: string; type?: string }> = []

  if (typeof surveyRaw === 'string') {
    // Survey is stored as JSON string - parse it
    try {
      const parsed = JSON.parse(surveyRaw)
      // The survey array is nested inside a .survey property
      if (parsed?.survey && Array.isArray(parsed.survey)) {
        surveyAnswers = parsed.survey
      } else if (Array.isArray(parsed)) {
        surveyAnswers = parsed
      }
    } catch {
      // Ignore parse errors
    }
  } else if (Array.isArray(surveyRaw)) {
    // Already parsed array
    surveyAnswers = surveyRaw
  }

  for (const surveyAnswer of surveyAnswers) {
    const answerValue = surveyAnswer.answer || surveyAnswer.value || ''

    // Check if answer type is explicitly 'email'
    if (surveyAnswer.type === 'email' && answerValue) {
      return answerValue
    }
    // Check if answer looks like an email (contains @)
    if (answerValue && answerValue.includes('@') && answerValue.includes('.')) {
      // Basic email validation
      const emailMatch = answerValue.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) {
        return emailMatch[0]
      }
    }
  }

  return null
}

/**
 * Parse Skool username slug into human-readable display name
 *
 * Skool usernames are formatted as: "first-last-1234" (lowercase with hyphens and trailing number)
 * This converts them to: "First Last" (title case without the trailing ID)
 *
 * Examples:
 *   "brandy-logue-5193" → "Brandy Logue"
 *   "john-smith-jr-1234" → "John Smith Jr"
 *   "amber-hawkins-downing-4306" → "Amber Hawkins Downing"
 */
function parseSkoolUsername(username: string | null): string | null {
  if (!username) return null

  // Remove trailing number pattern (e.g., "-5193")
  const withoutId = username.replace(/-\d+$/, '')

  // Replace hyphens with spaces and title case each word
  const words = withoutId.split('-')
  const titleCased = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return titleCased
}

/**
 * Transform Skool API member to database row format
 */
function transformMemberToRow(
  member: SkoolApiMember,
  groupSlug: string
): Omit<SkoolMemberRow, 'id' | 'created_at' | 'updated_at' | 'ghl_contact_id' | 'matched_at' | 'match_method'> {
  // Get display name: prefer displayName, fall back to parsing the username slug
  const displayName = member.displayName || parseSkoolUsername(member.name)

  return {
    skool_user_id: member.id,
    skool_username: member.name || null,
    display_name: displayName,
    email: extractMemberEmail(member), // Extract from metadata.mbme
    bio: member.bio || null,
    location: member.location || null,
    profile_image: member.profileImage || member.bubbleImage || null,
    social_links: {
      facebook: member.facebook || undefined,
      instagram: member.instagram || undefined,
      linkedin: member.linkedin || undefined,
      twitter: member.twitter || undefined,
      youtube: member.youtube || undefined,
      website: member.website || undefined,
    },
    group_slug: groupSlug,
    member_since: member.createdAt || null,
    last_online: member.member?.lastOffline || member.lastOffline || null,
    attribution_source: member.member?.metadata?.attrSrc || member.attrSrc || null,
    level: member.metadata?.spData?.lv || member.spData?.level || 1,
    points: member.metadata?.spData?.pts || member.spData?.points || 0,
  }
}

/**
 * Match Skool members to GHL contacts
 *
 * Matching strategy: EMAIL ONLY
 * - All Skool members have email (survey required or admin-invited)
 * - Match by email is 100% reliable, no name fallback needed
 *
 * Updates both skool_members.ghl_contact_id and contacts.skool_user_id
 */
async function matchMembersToContacts(
  supabase: ReturnType<typeof createServerClient>,
  groupSlug: string
): Promise<{ matched: number }> {
  let matched = 0

  // Get all unmatched Skool members with email
  // Note: Use .range() to bypass Supabase's default 1000 row limit
  const { data: unmatchedMembers, error: fetchError } = await supabase
    .from('skool_members')
    .select('id, skool_user_id, display_name, email')
    .eq('group_slug', groupSlug)
    .is('ghl_contact_id', null)
    .not('email', 'is', null)
    .range(0, 9999)

  if (fetchError || !unmatchedMembers) {
    console.error('[Skool Sync] Error fetching unmatched members:', fetchError)
    return { matched: 0 }
  }

  console.log(`[Skool Sync] ${unmatchedMembers.length} unmatched members with email`)

  // Get all contacts without skool_user_id (with email for matching)
  // Note: Use .range() to bypass Supabase's default 1000 row limit
  const { data: unmatchedContacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, ghl_contact_id, email')
    .is('skool_user_id', null)
    .not('email', 'is', null)
    .range(0, 9999)

  if (contactsError || !unmatchedContacts) {
    console.error('[Skool Sync] Error fetching unmatched contacts:', contactsError)
    return { matched: 0 }
  }

  console.log(`[Skool Sync] ${unmatchedContacts.length} contacts available for email matching`)

  // Build email lookup map for contacts
  const contactsByEmail = new Map<string, typeof unmatchedContacts[0]>()
  for (const contact of unmatchedContacts) {
    if (contact.email) {
      contactsByEmail.set(contact.email.toLowerCase().trim(), contact)
    }
  }

  // Match members to contacts by email
  const matchUpdates: Array<{
    memberId: string
    skoolUserId: string
    contactId: string
    ghlContactId: string
  }> = []

  for (const member of unmatchedMembers) {
    if (!member.email) continue

    const normalizedEmail = member.email.toLowerCase().trim()
    const matchedContact = contactsByEmail.get(normalizedEmail)

    if (matchedContact) {
      matchUpdates.push({
        memberId: member.id,
        skoolUserId: member.skool_user_id,
        contactId: matchedContact.id,
        ghlContactId: matchedContact.ghl_contact_id!,
      })
      // Remove from map to prevent duplicate matches
      contactsByEmail.delete(normalizedEmail)
    }
  }

  console.log(`[Skool Sync] Found ${matchUpdates.length} email matches`)

  // Apply matches in batches
  for (const match of matchUpdates) {
    try {
      // Update skool_members
      const { error: memberError } = await supabase
        .from('skool_members')
        .update({
          ghl_contact_id: match.ghlContactId,
          matched_at: new Date().toISOString(),
          match_method: 'email',
        })
        .eq('id', match.memberId)

      if (memberError) {
        console.error(`[Skool Sync] Error updating member ${match.memberId}:`, memberError)
        continue
      }

      // Update contacts with skool_user_id
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ skool_user_id: match.skoolUserId })
        .eq('id', match.contactId)

      if (contactError) {
        console.error(`[Skool Sync] Error updating contact ${match.contactId}:`, contactError)
        continue
      }

      matched++
    } catch (error) {
      console.error(`[Skool Sync] Error matching ${match.skoolUserId}:`, error)
    }
  }

  console.log(`[Skool Sync] Successfully matched ${matched} members to GHL contacts`)

  return { matched }
}

/**
 * Manually link a Skool member to a GHL contact
 */
export async function linkMemberToContact(
  skoolUserId: string,
  ghlContactId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()

  try {
    // Update skool_members
    const { error: memberError } = await supabase
      .from('skool_members')
      .update({
        ghl_contact_id: ghlContactId,
        matched_at: new Date().toISOString(),
        match_method: 'manual',
      })
      .eq('skool_user_id', skoolUserId)

    if (memberError) {
      return { success: false, error: memberError.message }
    }

    // Update contacts
    const { error: contactError } = await supabase
      .from('contacts')
      .update({ skool_user_id: skoolUserId })
      .eq('ghl_contact_id', ghlContactId)

    if (contactError) {
      return { success: false, error: contactError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get sync stats for a group
 */
/**
 * Match unmatched Skool members directly against GHL API
 *
 * This searches GHL directly by email, bypassing the need to have contacts
 * pre-synced to our database. Also adds "skool - completed registration" tag
 * to fix any tagging mistakes from Zapier.
 */
export async function matchMembersViaGhlApi(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<{ matched: number; tagged: number; notFound: number; errors: number }> {
  const supabase = createServerClient()

  // Dynamic import to avoid circular dependencies
  const { GHLClient } = await import('@/features/kpi/lib/ghl-client')
  const ghl = new GHLClient()

  const SKOOL_TAG = 'skool - completed registration'
  const stats = { matched: 0, tagged: 0, notFound: 0, errors: 0 }

  // Get unmatched Skool members with email
  const { data: unmatchedMembers, error } = await supabase
    .from('skool_members')
    .select('id, skool_user_id, email')
    .eq('group_slug', groupSlug)
    .is('ghl_contact_id', null)
    .not('email', 'is', null)
    .range(0, 9999)

  if (error || !unmatchedMembers) {
    console.error('[Skool Sync] Error fetching unmatched members:', error)
    return stats
  }

  console.log(`[Skool Sync] Searching GHL for ${unmatchedMembers.length} unmatched members...`)

  for (const member of unmatchedMembers) {
    if (!member.email) continue

    try {
      // Search GHL directly by email
      const contact = await ghl.searchContactByEmail(member.email)

      if (!contact) {
        stats.notFound++
        continue
      }

      // Check if contact needs the Skool tag
      const hasSkoolTag = contact.tags?.some(
        (t) => t.toLowerCase() === SKOOL_TAG.toLowerCase()
      )

      // Add Skool tag if missing (fix tagging mistakes)
      if (!hasSkoolTag) {
        try {
          await ghl.updateContactTags(contact.id, [SKOOL_TAG])
          stats.tagged++
        } catch (tagErr) {
          console.error(`[Skool Sync] Error tagging ${member.email}:`, tagErr)
        }
      }

      // Update skool_members with ghl_contact_id
      await supabase
        .from('skool_members')
        .update({
          ghl_contact_id: contact.id,
          matched_at: new Date().toISOString(),
          match_method: 'email',
        })
        .eq('id', member.id)

      // Upsert contact to our database (in case it wasn't synced)
      await supabase
        .from('contacts')
        .upsert({
          ghl_contact_id: contact.id,
          email: contact.email || null,
          phone: contact.phone || null,
          first_name: contact.firstName || null,
          last_name: contact.lastName || null,
          skool_user_id: member.skool_user_id,
          current_stage: 'member',
          stages: ['member'],
          credit_status: 'unknown',
          lead_age: 0,
          client_age: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'ghl_contact_id' })

      stats.matched++

      // Rate limit - 200ms between API calls
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (err) {
      console.error(`[Skool Sync] Error matching ${member.email}:`, err)
      stats.errors++
    }
  }

  console.log(`[Skool Sync] GHL API matching complete:`, stats)
  return stats
}

export async function getSkoolSyncStats(groupSlug: string = DEFAULT_GROUP.slug): Promise<{
  totalMembers: number
  matchedMembers: number
  unmatchedMembers: number
  lastSyncAt: string | null
}> {
  const supabase = createServerClient()

  // Get counts
  const { count: totalCount } = await supabase
    .from('skool_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_slug', groupSlug)

  const { count: matchedCount } = await supabase
    .from('skool_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_slug', groupSlug)
    .not('ghl_contact_id', 'is', null)

  // Get most recent update
  const { data: lastUpdated } = await supabase
    .from('skool_members')
    .select('updated_at')
    .eq('group_slug', groupSlug)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return {
    totalMembers: totalCount || 0,
    matchedMembers: matchedCount || 0,
    unmatchedMembers: (totalCount || 0) - (matchedCount || 0),
    lastSyncAt: lastUpdated?.updated_at || null,
  }
}
