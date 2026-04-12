/**
 * Mailgun email helper.
 *
 * Sends transactional email via Mailgun's HTTP API. Used by the Better Auth
 * `sendEmail` callback for password reset, email verification, organization
 * invitations, etc.
 *
 * Required env vars:
 *   MAILGUN_API_KEY     — scoped to a single sending domain
 *   MAILGUN_DOMAIN      — e.g. mail.0neos.com
 *   MAILGUN_FROM_EMAIL  — e.g. noreply@mail.0neos.com
 *
 * Behavior:
 *   - In development (NODE_ENV !== 'production'), missing config logs a
 *     warning and the message is written to the console instead of sent.
 *   - In production, missing config or send failure throws.
 */

export interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const from = process.env.MAILGUN_FROM_EMAIL

  if (!apiKey || !domain || !from) {
    const msg = '[email] Mailgun env not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN / MAILGUN_FROM_EMAIL)'
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    }
    console.warn(msg)
    console.log('[email] Would have sent:', { to: opts.to, subject: opts.subject })
    return
  }

  const form = new URLSearchParams()
  form.append('from', from)
  form.append('to', opts.to)
  form.append('subject', opts.subject)
  if (opts.text) form.append('text', opts.text)
  if (opts.html) form.append('html', opts.html)

  const auth = Buffer.from(`api:${apiKey}`).toString('base64')
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const msg = `[email] Mailgun send failed: ${res.status} ${res.statusText} — ${body}`
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    }
    console.error(msg)
  }
}
