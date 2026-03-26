import { NextRequest, NextResponse } from 'next/server'
import { safeErrorResponse } from '@/lib/security'
import { requireAuth, AuthError } from '@/lib/auth-helpers'
import { db, eq, count } from '@0ne/db/server'
import { skoolVariationGroups, skoolPostLibrary, skoolScheduledPosts } from '@0ne/db/server'

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
    await requireAuth()
    const { id } = await params

    const [data] = await db
      .select()
      .from(skoolVariationGroups)
      .where(eq(skoolVariationGroups.id, id))

    if (!data) {
      return NextResponse.json({ error: 'Variation group not found' }, { status: 404 })
    }

    // Get post count
    const [postResult] = await db
      .select({ value: count() })
      .from(skoolPostLibrary)
      .where(eq(skoolPostLibrary.variationGroupId, id))

    // Get scheduler count
    const [schedulerResult] = await db
      .select({ value: count() })
      .from(skoolScheduledPosts)
      .where(eq(skoolScheduledPosts.variationGroupId, id))

    const groupWithStats = {
      ...data,
      postCount: postResult?.value ?? 0,
      schedulerCount: schedulerResult?.value ?? 0,
    }

    return NextResponse.json({ group: groupWithStats })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[Variation Groups API] GET by ID exception:', error)
    return safeErrorResponse('Failed to fetch variation group', error)
  }
}
