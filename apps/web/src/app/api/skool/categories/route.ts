import { NextRequest, NextResponse } from 'next/server'
import { getCategories } from '@/features/skool/lib/post-client'

export const dynamic = 'force-dynamic'

// Known categories for the Fruitful community (fallback)
const FRUITFUL_CATEGORIES = [
  { id: null, name: 'The Money Room' },
  { id: null, name: 'Funding Club' },
  { id: null, name: 'Funding Hot Seat' },
  { id: null, name: 'General' },
  { id: null, name: 'Wins' },
]

/**
 * GET /api/skool/categories
 * Fetch Skool community categories/labels for dropdown selection
 *
 * Query params:
 * - group: Group slug (default: 'fruitful')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupSlug = searchParams.get('group') || 'fruitful'

    const result = await getCategories(groupSlug)

    if ('error' in result) {
      console.warn(
        `[Categories API] Could not fetch categories from Skool: ${result.error}`
      )
      // Return fallback categories when API fails
      return NextResponse.json({
        categories: FRUITFUL_CATEGORIES,
        source: 'fallback',
        note: 'Using fallback categories. Update category_id manually once discovered via browser DevTools.',
      })
    }

    return NextResponse.json({
      categories: result,
      source: 'skool_api',
    })
  } catch (error) {
    console.error('[Categories API] GET exception:', error)
    // Return fallback on any error
    return NextResponse.json({
      categories: FRUITFUL_CATEGORIES,
      source: 'fallback',
      note: 'API error - using fallback categories.',
      error: String(error),
    })
  }
}
