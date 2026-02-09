import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { canAccessApp, type AppId } from '@0ne/auth/permissions'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/embed(.*)',
  '/api/public(.*)',
  '/api/cron(.*)',
])

const appRoutes: Record<string, AppId> = {
  '/kpi': 'kpi',
  '/prospector': 'prospector',
  '/skool-sync': 'skoolSync',
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  const { userId } = await auth.protect()

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
