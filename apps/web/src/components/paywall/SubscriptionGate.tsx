'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { type ReactNode } from 'react'

interface SubscriptionGateProps {
  children: ReactNode
}

const ACTIVE_STATUSES = ['active', 'trialing', 'comped']

/**
 * Client-side subscription gate. Wraps protected content and shows a paywall
 * if the user's subscription is not active.
 *
 * Subscription status is read from Clerk publicMetadata.subscriptionStatus.
 * The middleware already blocks at the edge, but this component provides
 * an in-page fallback for client-navigated routes.
 *
 * Active statuses: 'active', 'trialing', 'comped'
 * Blocked: 'canceled', 'past_due', 'paused', undefined/null
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) return null

  const metadata = user?.publicMetadata as {
    subscriptionStatus?: string
    role?: string
    permissions?: { isAdmin?: boolean }
  } | undefined

  // Admins/owners always bypass the paywall
  if (metadata?.role === 'admin' || metadata?.role === 'owner' || metadata?.permissions?.isAdmin) {
    return <>{children}</>
  }

  const status = metadata?.subscriptionStatus
  const isActive = ACTIVE_STATUSES.includes(status || '')

  if (isActive) return <>{children}</>

  return <PaywallScreen status={status} />
}

function PaywallScreen({ status }: { status?: string }) {
  const { signOut } = useClerk()

  const statusMessages: Record<string, { title: string; message: string }> = {
    canceled: {
      title: 'Your subscription has been canceled',
      message: 'Your 0ne Cloud access has been suspended. Reactivate to continue using your apps and data.',
    },
    past_due: {
      title: 'Payment past due',
      message: 'We couldn\'t process your last payment. Please update your payment method to restore access.',
    },
    paused: {
      title: 'Your subscription is paused',
      message: 'Your 0ne Cloud access is currently paused. Resume your subscription to continue.',
    },
  }

  const { title, message } = statusMessages[status || ''] || {
    title: 'Subscription required',
    message: 'An active subscription is required to access 0ne Cloud.',
  }

  const reactivationUrl = process.env.NEXT_PUBLIC_REACTIVATION_URL

  return (
    <div className="min-h-screen bg-[#F6F5F3] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Lock icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF692D]/10">
          <svg className="h-8 w-8 text-[#FF692D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#22201D] mb-3">{title}</h1>
        <p className="text-[#666] mb-8">{message}</p>

        {reactivationUrl && (
          <a
            href={reactivationUrl}
            className="inline-block rounded-lg bg-[#FF692D] px-8 py-3 text-lg font-semibold text-white hover:bg-[#E55A1F] transition-colors"
          >
            Reactivate Subscription
          </a>
        )}

        <p className="text-sm text-[#999] mt-6">
          Your data is safe and will be here when you come back.
        </p>

        <div className="mt-8">
          <button
            onClick={() => signOut({ redirectUrl: '/sign-in' })}
            className="text-sm text-[#999] hover:text-[#666] underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export { PaywallScreen }
