'use client'

import { Sidebar, type NavItem } from './Sidebar'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { getAppNavigation, type AppId } from '@/lib/apps'
import { cn } from '@0ne/ui'

interface AppShellContentProps {
  children: React.ReactNode
}

function AppShellContent({ children }: AppShellContentProps) {
  const { isOpen } = useSidebar()

  return (
    <main
      className={cn(
        'min-h-screen transition-all duration-200 ease-in-out',
        isOpen ? 'lg:pl-60' : 'pl-0'
      )}
    >
      <div className={cn(
        'p-6 transition-all duration-200',
        !isOpen && 'pl-16' // Leave room for the "O" toggle
      )}>
        {children}
      </div>
    </main>
  )
}

interface AppShellProps {
  children: React.ReactNode
  title?: string
  appId?: AppId
  navigation?: NavItem[]
  showHomeLink?: boolean
}

export function AppShell({
  children,
  title,
  appId,
  navigation,
  showHomeLink,
}: AppShellProps) {
  // Get app-specific navigation if appId is provided
  const appNavigation = appId ? getAppNavigation(appId) : []
  const finalNavigation = navigation || appNavigation

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar navigation={finalNavigation} />
        <AppShellContent>{children}</AppShellContent>
      </div>
    </SidebarProvider>
  )
}

// Re-export for convenience
export { useSidebar } from './SidebarContext'
