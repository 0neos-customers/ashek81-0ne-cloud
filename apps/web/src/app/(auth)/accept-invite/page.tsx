'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@0ne/ui'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <AcceptInviteInner />
    </Suspense>
  )
}

function AcceptInviteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('token') || searchParams.get('invitationId') || ''

  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleAccept = async () => {
    if (!invitationId) {
      setState('error')
      setError('Invitation token is missing.')
      return
    }
    setState('loading')
    setError('')

    const { error: acceptError } = await authClient.organization.acceptInvitation({
      invitationId,
    })

    if (acceptError) {
      setState('error')
      setError(acceptError.message || 'Failed to accept invitation. You may need to sign in first.')
      return
    }

    setState('success')
    setTimeout(() => router.push('/'), 1500)
  }

  if (state === 'success') {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-heading font-bold">Welcome aboard</h2>
        <p className="text-muted-foreground">Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Accept invitation</h2>
        <p className="text-muted-foreground mt-1">
          You&apos;ve been invited to join a 0ne Cloud workspace.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={handleAccept} className="w-full" disabled={state === 'loading'}>
        {state === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Accept invitation
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Not signed in?{' '}
        <Link href={`/sign-in?next=/accept-invite?token=${invitationId}`} className="text-primary hover:underline font-medium">
          Sign in first
        </Link>
      </p>
    </div>
  )
}
