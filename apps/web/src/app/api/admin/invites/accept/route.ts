import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth-helpers'
import { db, eq, and } from '@0ne/db/server'
import { invites } from '@0ne/db/server'
import { safeErrorResponse } from '@/lib/security'

/**
 * Mark a legacy invite row as accepted. Called by the sign-up flow once a
 * Better Auth user has been created via the invite link.
 */
export async function POST(request: NextRequest) {
  let userId: string
  try {
    ;({ userId } = await requireAuth())
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const body = await request.json()
  const { invite_token } = body

  if (!invite_token) {
    return NextResponse.json({ error: 'invite_token required' }, { status: 400 })
  }

  try {
    await db
      .update(invites)
      .set({
        status: 'accepted',
        clerkUserId: userId, // column kept for backwards compat — now stores Better Auth user id
        acceptedAt: new Date(),
      })
      .where(and(eq(invites.inviteToken, invite_token), eq(invites.status, 'pending')))

    return NextResponse.json({ success: true })
  } catch (error) {
    return safeErrorResponse('Failed to accept invite', error)
  }
}
