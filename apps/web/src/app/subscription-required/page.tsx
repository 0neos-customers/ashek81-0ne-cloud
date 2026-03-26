import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const ACTIVE_STATUSES = ['active', 'trialing', 'comped']

const STATUS_MESSAGES: Record<string, { title: string; message: string }> = {
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

/**
 * Standalone paywall page. Users are redirected here by middleware when their
 * subscription status is not active. Also accessible via direct URL.
 *
 * If the user's subscription IS active (e.g., they just reactivated), redirects home.
 */
export default async function SubscriptionRequiredPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const metadata = user.publicMetadata as {
    subscriptionStatus?: string
    role?: string
    permissions?: { isAdmin?: boolean }
  } | undefined

  // If subscription is actually active (or user is admin), redirect home
  const status = metadata?.subscriptionStatus
  const isAdmin = metadata?.role === 'admin' || metadata?.role === 'owner' || metadata?.permissions?.isAdmin
  const isActive = ACTIVE_STATUSES.includes(status || '')

  if (isActive || isAdmin) {
    redirect('/')
  }

  const { title, message } = STATUS_MESSAGES[status || ''] || {
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
          <Link href="/sign-in" className="text-sm text-[#999] hover:text-[#666] underline">
            Sign out
          </Link>
        </div>
      </div>
    </div>
  )
}
