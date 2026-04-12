import { getSession } from '@/lib/auth-helpers'
import { AppTile } from '@/components/shell'
import { APPS } from '@/lib/apps'

export default async function HomePage() {
  const session = await getSession()
  const user = session?.user

  // The previous template filtered apps based on Clerk publicMetadata.
  // permissions. With Better Auth + per-customer instances, every signed-in
  // user sees the full app list — fork-level customization decides what's
  // visible. Customers can re-introduce per-user gating in their own fork.
  const enabledApps = APPS

  const greeting = user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Welcome'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground mt-1">
          Select an app to get started
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {enabledApps.map((app) => (
          <AppTile
            key={app.id}
            name={app.name}
            description={app.description}
            icon={app.icon}
            href={app.href}
            color={app.color}
          />
        ))}
      </div>

      {enabledApps.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold">Your 0ne is connected!</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Your account is set up. Add apps to your fork to see them here.
          </p>
        </div>
      )}
    </div>
  )
}
