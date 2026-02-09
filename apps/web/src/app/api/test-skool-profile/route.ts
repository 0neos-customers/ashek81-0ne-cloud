/**
 * Test endpoint for debugging Skool profile data
 * GET /api/test-skool-profile?username=pamela-cleary-9168
 */

import { NextResponse } from 'next/server'
import { getSkoolClient } from '@/features/skool/lib/skool-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') || 'pamela-cleary-9168'

  try {
    const skool = getSkoolClient()
    skool.clearCache() // Fresh buildId

    // Fetch profile using Next.js data route
    const profile = await skool.getMemberProfile(username)

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Return full profile for inspection
    return NextResponse.json({
      username,
      profile,
      // Extract specific email-related fields for debugging
      emailFields: {
        'email (top level)': profile.email,
        'member.metadata.mbme': profile.member?.metadata?.mbme,
        'metadata.mbme': profile.metadata?.mbme,
        'member.metadata.survey': profile.member?.metadata?.survey,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
