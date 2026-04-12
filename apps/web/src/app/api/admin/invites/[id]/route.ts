import { NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth-helpers'
import { db, eq } from '@0ne/db/server'
import { invites } from '@0ne/db/server'
import { safeErrorResponse } from '@/lib/security'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const { id } = await params

  try {
    // Hard-delete per Jimmy's preference (feedback_hard_delete_tokens.md)
    await db.delete(invites).where(eq(invites.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    return safeErrorResponse('Failed to delete invite', error)
  }
}
