'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Label } from '@0ne/ui'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <SignUpInner />
    </Suspense>
  )
}

function SignUpInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [inviteData, setInviteData] = useState<{ email: string; name: string } | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) {
      setInviteValid(false)
      return
    }

    fetch(`/api/admin/invites/validate?token=${inviteToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInviteValid(true)
          setInviteData(data.invite)
          if (data.invite.email) setEmail(data.invite.email)
          if (data.invite.name) {
            const parts = data.invite.name.split(' ')
            setFirstName(parts[0] || '')
            setLastName(parts.slice(1).join(' ') || '')
          }
        } else {
          setInviteValid(false)
        }
      })
      .catch(() => setInviteValid(false))
  }, [inviteToken])

  if (inviteValid === false) {
    router.replace('/request-access')
    return null
  }

  if (inviteValid === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0]

    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: fullName,
    })

    if (signUpError) {
      setError(signUpError.message || 'Sign-up failed.')
      setLoading(false)
      return
    }

    // Mark invite accepted (server-side update; non-blocking)
    if (inviteToken) {
      fetch('/api/admin/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_token: inviteToken }),
      }).catch(() => {})
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold">Check your email</h2>
          <p className="text-muted-foreground mt-2">
            We sent a verification link to <strong>{email}</strong>. Click it to finish setting up your account.
          </p>
        </div>
        <Link href="/sign-in" className="text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Create your account</h2>
        <p className="text-muted-foreground mt-1">
          {inviteData?.name
            ? `Welcome, ${inviteData.name}. Let's get you set up.`
            : 'Set up your 0ne account to get started.'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            readOnly={!!inviteData?.email}
            className={inviteData?.email ? 'bg-muted' : ''}
          />
          {inviteData?.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Pre-filled from your invite
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            minLength={8}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
