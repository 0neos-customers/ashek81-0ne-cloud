import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { canAccessApp, type AppId } from '@0ne/auth/permissions'

// Redirect all domains to app.0neos.com (canonical)
function handleDomainRedirect(request: NextRequest): NextResponse | null {
  const hostname = request.headers.get('host') || ''

  // These are the canonical app subdomain — no redirect needed
  if (hostname === 'app.0neos.com') {
    return null
  }

  // All other 0ne domains redirect to the canonical app subdomain
  const redirectDomains = [
    '0neos.com', 'www.0neos.com',
    'project0ne.ai', 'www.project0ne.ai', 'app.project0ne.ai',
    'project0ne.com', 'www.project0ne.com',
    '0necloud.com', 'www.0necloud.com',
    '0nesync.com', 'www.0nesync.com',
    'install0ne.com', 'www.install0ne.com',
  ]

  if (redirectDomains.includes(hostname)) {
    const url = request.nextUrl.clone()
    url.host = 'app.0neos.com'
    return NextResponse.redirect(url, 307)
  }

  return null
}

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/request-access',
  '/embed(.*)',
  '/privacy',
  '/security-policy',
  '/access-control',
  '/api/public(.*)',
  '/api/cron(.*)',
  '/api/external(.*)', // External API uses API key auth
  '/api/extension(.*)', // Chrome extension uses API key auth
  '/api/auth(.*)', // OAuth callbacks
  '/api/webhooks(.*)', // Webhooks from external services
  '/api/widget(.*)', // Widget API uses its own token auth
  '/api/admin/invites/validate', // Invite validation (pre-auth)
])

const appRoutes: Record<string, AppId> = {
  '/kpi': 'kpi',
  '/prospector': 'prospector',
  '/skool-sync': 'skoolSync',
  '/skool': 'skoolScheduler',
  '/media': 'ghlMedia',
}

export default clerkMiddleware(async (auth, request) => {
  // Handle domain redirect before anything else
  const domainRedirect = handleDomainRedirect(request)
  if (domainRedirect) return domainRedirect

  const { pathname } = request.nextUrl

  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  const { userId, sessionClaims } = await auth.protect()

  // Onboarding redirect: if user hasn't completed onboarding, send them there
  const skipOnboardingCheck =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/sign-out')

  if (!skipOnboardingCheck) {
    const metadata = sessionClaims?.metadata as { onboardingComplete?: boolean; permissions?: { isAdmin?: boolean } } | undefined
    const isAdmin = metadata?.permissions?.isAdmin === true
    // Admins without onboardingComplete are treated as complete (existing users)
    if (!metadata?.onboardingComplete && !isAdmin) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  for (const [route, appId] of Object.entries(appRoutes)) {
    if (pathname.startsWith(route)) {
      const hasAccess = await canAccessApp(userId, appId)
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
