import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

export { clerkMiddleware, createRouteMatcher }

export const createPublicRouteMatcher = (routes: string[]) => {
  return createRouteMatcher(routes)
}

export const defaultPublicRoutes = [
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/embed(.*)',
  '/api/public(.*)',
  '/api/cron(.*)',
]
