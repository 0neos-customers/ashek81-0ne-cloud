'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <VerifyEmailInner />
    </Suspense>
  )
}

function VerifyEmailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setError('Verification link is missing or malformed.')
      return
    }

    let cancelled = false
    ;(async () => {
      // Better Auth's verifyEmail endpoint is GET /api/auth/verify-email?token=…
      // The client helper hits the same endpoint.
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
      })
      if (cancelled) return
      if (res.ok) {
        setState('success')
        setTimeout(() => router.push('/'), 1500)
      } else {
        setState('error')
        const body = await res.json().catch(() => null)
        setError(body?.message || 'Verification failed. The link may have expired.')
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Verifying your email…</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold">Email verified</h2>
          <p className="text-muted-foreground mt-2">Redirecting you to your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <AlertCircle className="h-12 w-12 text-red-600" />
      </div>
      <div>
        <h2 className="text-2xl font-heading font-bold">Verification failed</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
      </div>
      <Link href="/sign-in" className="text-sm text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  )
}
