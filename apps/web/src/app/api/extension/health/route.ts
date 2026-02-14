import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/extension/health
 * Health check endpoint for the Chrome extension
 * No authentication required
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'skool-extension-api',
  })
}
