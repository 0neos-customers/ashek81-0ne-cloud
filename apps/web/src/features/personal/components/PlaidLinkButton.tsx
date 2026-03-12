'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@0ne/ui'
import { Plus, Loader2, AlertCircle } from 'lucide-react'

interface PlaidLinkButtonProps {
  onSuccess: () => void
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExchanging, setIsExchanging] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const shouldOpenRef = useRef(false)

  const fetchLinkToken = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const response = await fetch('/api/personal/banking/link-token', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.link_token) {
        shouldOpenRef.current = true
        setLinkToken(data.link_token)
      } else {
        setErrorMsg(data.error || data.details || `API ${response.status}`)
      }
    } catch (error) {
      setErrorMsg(String(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const { open, ready, error: plaidError } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      setIsExchanging(true)
      setErrorMsg(null)
      try {
        const response = await fetch('/api/personal/banking/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken }),
        })
        const data = await response.json()
        if (data.success) {
          onSuccess()
        } else {
          setErrorMsg(data.error || 'Exchange failed')
        }
      } catch (error) {
        setErrorMsg(String(error))
      } finally {
        setIsExchanging(false)
        setLinkToken(null)
      }
    },
    onExit: () => {
      setLinkToken(null)
    },
  })

  // Show Plaid hook errors
  useEffect(() => {
    if (plaidError) {
      setErrorMsg(`Plaid: ${plaidError.message || String(plaidError)}`)
    }
  }, [plaidError])

  // Auto-open Plaid Link when token arrives and hook is ready
  useEffect(() => {
    if (linkToken && ready && shouldOpenRef.current) {
      shouldOpenRef.current = false
      open()
    }
  }, [linkToken, ready, open])

  const handleClick = async () => {
    setErrorMsg(null)
    if (linkToken && ready) {
      open()
    } else {
      await fetchLinkToken()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={isLoading || isExchanging}>
        {isLoading || isExchanging ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        {isExchanging ? 'Connecting...' : 'Connect Account'}
      </Button>
      {errorMsg && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {errorMsg}
        </p>
      )}
    </div>
  )
}
