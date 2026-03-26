import { NextResponse } from 'next/server'
import { safeErrorResponse } from '@/lib/security'
import { auth } from '@clerk/nextjs/server'
import { getLatestMetrics } from '@/features/skool/lib/metrics-sync'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const metrics = await getLatestMetrics()

    if (!metrics) {
      return NextResponse.json({ error: 'No Skool metrics found' }, { status: 404 })
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Skool metrics error:', error)
    return safeErrorResponse('Failed to fetch Skool metrics', error)
  }
}
