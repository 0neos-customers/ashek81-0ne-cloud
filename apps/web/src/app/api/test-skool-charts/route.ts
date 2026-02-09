import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSkoolClient } from '@/features/skool/lib/skool-client'

export const dynamic = 'force-dynamic'

const GROUP_SLUG = 'fruitful'

/**
 * Test endpoint to explore Skool analytics chart types
 * Try different chart parameters to find member growth data
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const chart = searchParams.get('chart') || 'members'
  const range = searchParams.get('range') || '30'
  const amt = searchParams.get('amt') || 'daily' // daily, monthly

  try {
    const skool = getSkoolClient()

    // Try analytics endpoint with chart param
    const analyticsUrl = `https://api2.skool.com/groups/${GROUP_SLUG}/analytics?chart=${chart}&range=${range}`
    console.log(`[Test] Trying: ${analyticsUrl}`)

    const analyticsResponse = await skool.fetchWithAuth(analyticsUrl)
    let analyticsData = null
    if (analyticsResponse.ok) {
      analyticsData = await analyticsResponse.json()
      console.log(`[Test] Analytics response:`, JSON.stringify(analyticsData, null, 2).slice(0, 500))
    } else {
      console.log(`[Test] Analytics failed: ${analyticsResponse.status}`)
    }

    // Try admin-metrics with different params
    const adminUrl = `https://api2.skool.com/groups/${GROUP_SLUG}/admin-metrics?range=${range}d&amt=${amt}`
    console.log(`[Test] Trying: ${adminUrl}`)

    const adminResponse = await skool.fetchWithAuth(adminUrl)
    let adminData = null
    if (adminResponse.ok) {
      adminData = await adminResponse.json()
      console.log(`[Test] Admin metrics response:`, JSON.stringify(adminData, null, 2).slice(0, 500))
    } else {
      console.log(`[Test] Admin metrics failed: ${adminResponse.status}`)
    }

    return NextResponse.json({
      testedUrls: {
        analytics: analyticsUrl,
        admin: adminUrl,
      },
      analytics: analyticsData,
      admin: adminData,
    })
  } catch (error) {
    console.error('[Test] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
