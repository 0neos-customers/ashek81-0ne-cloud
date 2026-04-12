import { NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth-helpers'
import { db, eq } from '@0ne/db/server'
import { user, member } from '@0ne/db/schema'

/**
 * GET  /api/admin/permissions  — list members of this instance's organization
 * POST /api/admin/permissions  — update a member's role
 *
 * Replaces the previous Clerk publicMetadata.instances[slug] permission model.
 * In the per-customer Better Auth model, role lives on the `member` row
 * (organization plugin). The legacy "isAdmin / per-app toggles" shape is
 * collapsed to a single role field with values: owner | admin | member.
 *
 * The response shape is kept compatible with the existing admin UI which
 * expects { id, email, firstName, lastName, permissions: { isAdmin, apps } }.
 * apps is always an empty object now — customers wire per-app gating in
 * their own fork.
 */

export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  try {
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))

    const users = rows.map((row) => {
      const [first = '', ...rest] = (row.name || '').split(' ')
      return {
        id: row.id,
        email: row.email,
        firstName: first,
        lastName: rest.join(' '),
        imageUrl: row.image || undefined,
        role: row.role,
        permissions: {
          apps: {},
          isAdmin: row.role === 'owner' || row.role === 'admin',
        },
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  try {
    const body = await request.json()
    const { targetUserId, isAdmin } = body as {
      targetUserId: string
      appId?: string
      enabled?: boolean
      isAdmin?: boolean
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
    }

    if (isAdmin !== undefined) {
      const newRole = isAdmin ? 'admin' : 'member'
      await db
        .update(member)
        .set({ role: newRole })
        .where(eq(member.userId, targetUserId))
    }

    // Per-app toggles are no-ops in the template default — customers wire
    // their own permission model in their fork.

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
  }
}
