import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db, eq, and } from '@0ne/db/server'
import { member } from '@0ne/db/schema'

/**
 * Server-side auth helpers for API routes and server components.
 *
 * Built on Better Auth. Replaces the previous Clerk-based helpers.
 */

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

/**
 * Read the current session from the request cookies. Returns null if the
 * user is not signed in.
 */
export async function getSession(): Promise<AuthSession | null> {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * Require an authenticated user. Throws AuthError(401) if not signed in.
 */
export async function requireAuth(): Promise<{ userId: string; session: AuthSession }> {
  const session = await getSession()
  if (!session?.user) {
    throw new AuthError('Authentication required', 401)
  }
  return { userId: session.user.id, session }
}

/**
 * Require an admin or owner of any organization. Throws 401 if not signed in,
 * 403 if not an admin/owner.
 *
 * In the per-customer Better Auth model, "admin" means the user is a
 * member with role 'owner' or 'admin' on the single org for this instance.
 */
export async function requireAdmin(): Promise<{ userId: string; session: AuthSession }> {
  const { userId, session } = await requireAuth()
  const isAdmin = await isUserAdmin(userId)
  if (!isAdmin) {
    throw new AuthError('Admin role required', 403)
  }
  return { userId, session }
}

/**
 * Check whether a user is an owner/admin of any organization in this instance.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(eq(member.userId, userId))
  return rows.some((r) => r.role === 'owner' || r.role === 'admin')
}

/**
 * List the organizations a user belongs to.
 */
export async function listUserOrganizations(userId: string) {
  return db
    .select()
    .from(member)
    .where(eq(member.userId, userId))
}

export { eq, and }
