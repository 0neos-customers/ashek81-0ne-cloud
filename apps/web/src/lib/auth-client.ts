/**
 * Better Auth client for the browser.
 *
 * Use from client components for sign-in, sign-up, password reset, MFA,
 * organization management, etc. Server components should call `auth.api.*`
 * from `@/lib/auth` directly instead.
 */

import { createAuthClient } from 'better-auth/react'
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient(), twoFactorClient()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
