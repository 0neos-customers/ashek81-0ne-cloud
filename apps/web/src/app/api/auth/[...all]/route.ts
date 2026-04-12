/**
 * Better Auth API handler.
 *
 * Catch-all route that mounts all of Better Auth's HTTP endpoints under
 * /api/auth/*. This is the only file that needs to exist for sign-in,
 * sign-up, sign-out, password reset, OAuth callback, organization, MFA, etc.
 */

import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'

export const { GET, POST } = toNextJsHandler(auth.handler)
