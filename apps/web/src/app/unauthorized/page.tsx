import Link from 'next/link'
import { Button } from '@0ne/ui'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground text-center max-w-md">
        You don&apos;t have permission to access this app. Contact an
        administrator to request access.
      </p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  )
}
