import { currentUser } from '@clerk/nextjs/server'
import { getCurrentUserPermissions, getEnabledApps } from '@0ne/auth/permissions'
import { AppTile } from '@/components/shell'
import { APPS } from '@/lib/apps'

export default async function HomePage() {
  const user = await currentUser()
  const permissions = await getCurrentUserPermissions()
  const enabledAppIds = permissions ? getEnabledApps(permissions) : []

  const greeting = user?.firstName ? `Welcome, ${user.firstName}` : 'Welcome'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground mt-1">
          Select an app to get started
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {APPS.filter((app) => enabledAppIds.includes(app.id)).map((app) => (
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

      {enabledAppIds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No apps are enabled for your account. Contact an administrator to
            request access.
          </p>
        </div>
      )}
    </div>
  )
}
