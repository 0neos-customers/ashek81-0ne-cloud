import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createLinkToken } from '@/lib/plaid-client'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Plaid] Creating link token for user:', userId)
    console.log('[Plaid] ENV check:', {
      hasClientId: !!process.env.PLAID_CLIENT_ID,
      hasSecret: !!process.env.PLAID_SECRET,
      env: process.env.PLAID_ENV || 'missing',
    })
    const linkToken = await createLinkToken(userId)
    console.log('[Plaid] Link token created successfully')
    return NextResponse.json({ link_token: linkToken })
  } catch (error) {
    console.error('[Plaid] Create link token error:', error)
    return NextResponse.json(
      { error: 'Failed to create link token', details: String(error) },
      { status: 500 }
    )
  }
}
