'use client'

import { type ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'

interface SubscriptionGateProps {
  children: ReactNode
}

/**
 * Client-side subscription gate.
 *
 * Was previously wired to Clerk publicMetadata.subscriptionStatus. With the
 * Better Auth migration, subscription state is no longer stored on the user
 * record (each customer fork can wire their own billing — Stripe, Skool, etc.
 * — using the org plugin's metadata field or a separate table).
 *
 * Default behavior: pass through. Customers re-enable per-user paywalls by
 * implementing their own check here.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { isPending } = authClient.useSession()
  if (isPending) return null
  return <>{children}</>
}

/** Compatibility export — kept so existing imports don't break. */
export function PaywallScreen() {
  return null
}
