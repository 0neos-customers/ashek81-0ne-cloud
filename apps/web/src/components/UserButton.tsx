'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

interface UserButtonProps {
  size?: 'sm' | 'md'
}

/**
 * Replacement for Clerk's <UserButton>. Shows a circular avatar with the
 * user's first initial and a dropdown with sign-out.
 */
export function UserButton({ size = 'md' }: UserButtonProps) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)

  const user = session?.user
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase()
  const dim = size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base'

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex ${dim} items-center justify-center rounded-full bg-primary/15 text-primary font-semibold hover:bg-primary/25 transition-colors`}
        aria-label="Account menu"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-popover p-2 shadow-lg">
            <div className="px-3 py-2 border-b mb-1">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
