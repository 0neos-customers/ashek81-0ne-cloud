/**
 * Skool Revenue Sync
 *
 * Syncs MRR and revenue metrics from Skool's analytics-overview endpoint.
 */

import { createClient } from '@supabase/supabase-js'
import { getSkoolClient } from './skool-client'

// =============================================================================
// TYPES
// =============================================================================

interface RevenueSyncResult {
  success: boolean
  snapshot?: {
    groupSlug: string
    date: string
    mrrDollars: number
    numMembers: number
    paidMembers: number
    freeMembers: number
    retention: number
    conversion: number
  }
  error?: string
}

interface RevenueSnapshot {
  group_slug: string
  snapshot_date: string
  mrr: number
  retention_rate: number
  paying_members: number
  source: string
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(url, key)
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Sync revenue data from Skool analytics-overview endpoint
 * Stores daily snapshot in skool_revenue_daily table
 */
export async function syncSkoolRevenue(groupSlug: string = 'fruitful'): Promise<RevenueSyncResult> {
  console.log(`[revenue-sync] Starting revenue sync for ${groupSlug}`)

  try {
    const skool = getSkoolClient()
    const supabase = getSupabaseClient()

    // Fetch analytics overview (has MRR, retention, conversion)
    const overview = await skool.getAnalyticsOverview(groupSlug)
    console.log(`[revenue-sync] Got overview: MRR=${overview.mrrCents}¢, retention=${overview.retention}`)

    // Fetch membership products (has free member count)
    const products = await skool.getMembershipProducts(groupSlug)
    console.log(`[revenue-sync] Got products: freeMembers=${products.freeMembers}`)

    // Calculate paid members
    const paidMembers = overview.numMembers - products.freeMembers

    // Convert MRR from cents to dollars
    const mrrDollars = overview.mrrCents / 100

    // Prepare snapshot
    const today = new Date().toISOString().split('T')[0]
    const snapshot: RevenueSnapshot = {
      group_slug: groupSlug,
      snapshot_date: today,
      mrr: mrrDollars,
      retention_rate: overview.retention * 100, // Convert 0-1 to percentage
      paying_members: paidMembers,
      source: 'skool_api',
    }

    // Upsert to database
    const { error } = await supabase
      .from('skool_revenue_daily')
      .upsert(snapshot, {
        onConflict: 'group_slug,snapshot_date',
      })

    if (error) {
      throw new Error(`Failed to save revenue snapshot: ${error.message}`)
    }

    console.log(`[revenue-sync] Saved snapshot: MRR=$${mrrDollars}, paid=${paidMembers}, retention=${overview.retention * 100}%`)

    return {
      success: true,
      snapshot: {
        groupSlug,
        date: today,
        mrrDollars,
        numMembers: overview.numMembers,
        paidMembers,
        freeMembers: products.freeMembers,
        retention: overview.retention * 100,
        conversion: overview.conversion * 100,
      },
    }
  } catch (error) {
    console.error('[revenue-sync] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the latest revenue snapshot for a group
 */
export async function getLatestRevenueSnapshot(groupSlug: string = 'fruitful') {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('skool_revenue_daily')
    .select('*')
    .eq('group_slug', groupSlug)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('[revenue-sync] Error fetching latest snapshot:', error)
    return null
  }

  return data
}

/**
 * Get revenue history for a date range
 */
export async function getRevenueHistory(
  groupSlug: string = 'fruitful',
  startDate: string,
  endDate: string
) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('skool_revenue_daily')
    .select('*')
    .eq('group_slug', groupSlug)
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
    .order('snapshot_date', { ascending: true })

  if (error) {
    console.error('[revenue-sync] Error fetching revenue history:', error)
    return []
  }

  return data || []
}

/**
 * Get MRR change between two dates
 */
export async function getMrrChange(
  groupSlug: string = 'fruitful',
  startDate: string,
  endDate: string
): Promise<{
  startMrr: number
  endMrr: number
  change: number
  changePercent: number | null
}> {
  const supabase = getSupabaseClient()

  // Get MRR at start
  const { data: startData } = await supabase
    .from('skool_revenue_daily')
    .select('mrr')
    .eq('group_slug', groupSlug)
    .lte('snapshot_date', startDate)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  // Get MRR at end
  const { data: endData } = await supabase
    .from('skool_revenue_daily')
    .select('mrr')
    .eq('group_slug', groupSlug)
    .lte('snapshot_date', endDate)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  const startMrr = startData?.mrr || 0
  const endMrr = endData?.mrr || 0
  const change = endMrr - startMrr
  const changePercent = startMrr > 0 ? ((change / startMrr) * 100) : null

  return { startMrr, endMrr, change, changePercent }
}
