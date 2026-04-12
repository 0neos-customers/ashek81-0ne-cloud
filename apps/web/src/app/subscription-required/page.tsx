import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth-helpers'

/**
 * Standalone paywall page. The Clerk-based subscription gating was removed
 * in Phase A of the Better Auth migration — this page now serves as a
 * informational placeholder. Customers wire their own billing in their
 * fork.
 */
export default async function SubscriptionRequiredPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // No subscription gating in template default. Send the user home.
  redirect('/')

  // Unreachable, but keep a fallback render to satisfy TS.
  const skoolUrl = process.env.NEXT_PUBLIC_REACTIVATION_URL
  return (
    <div className="min-h-screen bg-[#F6F5F3] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold text-[#22201D] mb-3">Subscription required</h1>
        <p className="text-[#666] mb-8">An active subscription is required to access 0ne Cloud.</p>
        {skoolUrl && (
          <a
            href={skoolUrl}
            className="inline-block rounded-lg bg-[#FF692D] px-6 py-3 font-semibold text-white hover:bg-[#E55A1F] transition-colors"
          >
            Reactivate
          </a>
        )}
        <div className="mt-8">
          <Link href="/sign-in" className="text-sm text-[#999] hover:text-[#666] underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
