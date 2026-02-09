/**
 * Skool Sync Cron Endpoint
 *
 * Syncs Skool community members AND metrics to Supabase.
 * Run daily or manually via:
 *
 * curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-skool"
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncSkoolMembers, getSkoolSyncStats } from '@/features/skool/lib/member-sync'
import { syncSkoolMetrics, getLatestMetrics } from '@/features/skool/lib/metrics-sync'
import { syncSkoolRevenue, getLatestRevenueSnapshot } from '@/features/skool/lib/revenue-sync'
import { DEFAULT_GROUP } from '@/features/skool/lib/config'
import { getSkoolClient } from '@/features/skool/lib/skool-client'
import { SyncLogger } from '@/lib/sync-log'

export const maxDuration = 300 // 5 minutes max for sync

/**
 * GET /api/cron/sync-skool
 *
 * Syncs all Skool members and metrics to the database.
 *
 * Query params:
 * - group: Group slug to sync (default: fruitful)
 * - stats: If 'true', return stats only without syncing
 * - metrics: If 'only', only sync metrics (skip members)
 * - members: If 'only', only sync members (skip metrics)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group') || DEFAULT_GROUP.slug
  const statsOnly = searchParams.get('stats') === 'true'
  const metricsOnly = searchParams.get('metrics') === 'only'
  const membersOnly = searchParams.get('members') === 'only'
  const revenueOnly = searchParams.get('revenue') === 'only'
  const testCharts = searchParams.get('test') === 'charts'

  try {
    // Test mode: discover available chart types for member data
    if (testCharts) {
      const skool = getSkoolClient()
      const results: Record<string, unknown> = {}

      // Based on existing patterns, try various chart names
      const chartTypes = [
        'members',
        'members_by_day',
        'growth',
        'new_members',
        'retention',
        'churn',
      ]

      for (const chart of chartTypes) {
        try {
          const url = `https://api2.skool.com/groups/${group}/analytics?chart=${chart}&range=30`
          console.log(`[Test] Trying: ${url}`)
          const response = await skool.fetchWithAuth(url)
          if (response.ok) {
            const data = await response.json()
            results[chart] = { status: 'ok', data }
            console.log(`[Test] ${chart}: OK - ${JSON.stringify(data).slice(0, 200)}`)
          } else {
            results[chart] = { status: response.status }
            console.log(`[Test] ${chart}: ${response.status}`)
          }
        } catch (e) {
          results[chart] = { status: 'error', error: String(e) }
        }
      }

      // Also try admin-metrics with different amt values
      for (const amt of ['daily', 'weekly', 'monthly']) {
        try {
          const url = `https://api2.skool.com/groups/${group}/admin-metrics?range=30d&amt=${amt}`
          console.log(`[Test] Trying: ${url}`)
          const response = await skool.fetchWithAuth(url)
          if (response.ok) {
            const data = await response.json()
            results[`admin-metrics-${amt}`] = { status: 'ok', data }
            console.log(`[Test] admin-metrics-${amt}: OK`)
          } else {
            results[`admin-metrics-${amt}`] = { status: response.status }
          }
        } catch (e) {
          results[`admin-metrics-${amt}`] = { status: 'error', error: String(e) }
        }
      }

      return NextResponse.json({ testResults: results })
    }

    // Test mode for revenue API discovery
    const testRevenue = searchParams.get('test') === 'revenue'
    if (testRevenue) {
      const skool = getSkoolClient()
      const results: Record<string, unknown> = {}

      // Potential revenue/MRR endpoints to probe
      const endpoints = [
        // admin-metrics with revenue-related amt values
        { name: 'admin-metrics-revenue', url: `/groups/${group}/admin-metrics?amt=revenue` },
        { name: 'admin-metrics-mrr', url: `/groups/${group}/admin-metrics?amt=mrr` },
        { name: 'admin-metrics-billing', url: `/groups/${group}/admin-metrics?amt=billing` },
        { name: 'admin-metrics-subscriptions', url: `/groups/${group}/admin-metrics?amt=subscriptions` },
        { name: 'admin-metrics-cashflow', url: `/groups/${group}/admin-metrics?amt=cashflow` },
        { name: 'admin-metrics-unit_economics', url: `/groups/${group}/admin-metrics?amt=unit_economics` },

        // Direct billing/revenue endpoints
        { name: 'billing', url: `/groups/${group}/billing` },
        { name: 'billing-overview', url: `/groups/${group}/billing-overview` },
        { name: 'revenue', url: `/groups/${group}/revenue` },
        { name: 'subscriptions', url: `/groups/${group}/subscriptions` },
        { name: 'payments', url: `/groups/${group}/payments` },

        // Analytics chart variations
        { name: 'analytics-mrr', url: `/groups/${group}/analytics?chart=mrr` },
        { name: 'analytics-revenue', url: `/groups/${group}/analytics?chart=revenue` },
        { name: 'analytics-ltv', url: `/groups/${group}/analytics?chart=ltv` },
        { name: 'analytics-retention', url: `/groups/${group}/analytics?chart=retention` },
        { name: 'analytics-churn', url: `/groups/${group}/analytics?chart=churn` },
        { name: 'analytics-subscriptions', url: `/groups/${group}/analytics?chart=subscriptions` },
        { name: 'analytics-billing', url: `/groups/${group}/analytics?chart=billing` },

        // Settings/dashboard endpoints (as seen on Skool Settings > Dashboard)
        { name: 'settings-dashboard', url: `/groups/${group}/settings/dashboard` },
        { name: 'settings-billing', url: `/groups/${group}/settings/billing` },
        { name: 'dashboard', url: `/groups/${group}/dashboard` },
        { name: 'dashboard-metrics', url: `/groups/${group}/dashboard-metrics` },

        // Community commerce endpoints
        { name: 'commerce', url: `/groups/${group}/commerce` },
        { name: 'commerce-subscriptions', url: `/groups/${group}/commerce/subscriptions` },
        { name: 'commerce-revenue', url: `/groups/${group}/commerce/revenue` },

        // Analytics overview (discovered from Skoot extension - primary MRR source!)
        { name: 'analytics-overview', url: `/groups/${group}/analytics-overview` },

        // Membership products (subscription tiers/pricing)
        { name: 'membership-products', url: `/groups/${group}/membership-products?model=subscription` },

        // Trials conversion
        { name: 'analytics-trials', url: `/groups/${group}/analytics?chart=conversion_trials` },
      ]

      for (const { name, url } of endpoints) {
        try {
          const fullUrl = `https://api2.skool.com${url}`
          console.log(`[Test Revenue] Trying: ${name} - ${fullUrl}`)
          const response = await skool.fetchWithAuth(fullUrl)

          if (response.ok) {
            const data = await response.json()
            results[name] = {
              status: 'ok',
              url,
              dataKeys: Object.keys(data),
              sample: JSON.stringify(data).slice(0, 500)
            }
            console.log(`[Test Revenue] ${name}: OK - Keys: ${Object.keys(data).join(', ')}`)
          } else {
            results[name] = { status: response.status, url }
            console.log(`[Test Revenue] ${name}: ${response.status}`)
          }
        } catch (e) {
          results[name] = { status: 'error', url, error: String(e) }
        }
      }

      return NextResponse.json({
        message: 'Revenue API discovery complete. Check "ok" results for working endpoints.',
        testResults: results
      })
    }
    // Stats only mode
    if (statsOnly) {
      const [memberStats, latestMetrics, latestRevenue] = await Promise.all([
        getSkoolSyncStats(group),
        getLatestMetrics(group),
        getLatestRevenueSnapshot(group),
      ])
      return NextResponse.json({
        success: true,
        group,
        memberStats,
        latestMetrics,
        latestRevenue,
      })
    }

    // Revenue only mode
    if (revenueOnly) {
      const revenueResult = await syncSkoolRevenue(group)
      return NextResponse.json({
        success: revenueResult.success,
        group,
        revenue: revenueResult,
      })
    }

    // Full sync
    console.log(`[sync-skool] Starting sync for group: ${group}`)
    const startTime = Date.now()

    // Start sync logging
    const syncLog = new SyncLogger('skool')
    await syncLog.start({
      group,
      metricsOnly,
      membersOnly,
    })

    // Sync members (unless metrics-only)
    let memberResult = null
    if (!metricsOnly) {
      memberResult = await syncSkoolMembers(group)
    }

    // Sync metrics (unless members-only)
    let metricsResult = null
    if (!membersOnly) {
      metricsResult = await syncSkoolMetrics(group)
    }

    // Sync revenue (unless members-only or metrics-only)
    let revenueResult = null
    if (!membersOnly && !metricsOnly) {
      revenueResult = await syncSkoolRevenue(group)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[sync-skool] Completed in ${duration}s`)

    // Calculate total records synced
    const membersSynced = memberResult?.stats?.inserted || memberResult?.stats?.updated || 0
    const success = (memberResult?.success ?? true) && (metricsResult?.success ?? true) && (revenueResult?.success ?? true)

    // Complete or fail sync log
    if (success) {
      await syncLog.complete(membersSynced, {
        metricsSuccess: metricsResult?.success,
        revenueSuccess: revenueResult?.success,
      })
    } else {
      const errorMessages = [
        memberResult?.errors?.join(', '),
        metricsResult?.error,
        revenueResult?.error,
      ].filter(Boolean).join('; ')
      await syncLog.fail(errorMessages || 'Unknown error', membersSynced)
    }

    return NextResponse.json({
      success,
      group,
      duration: `${duration}s`,
      members: memberResult
        ? {
            stats: memberResult.stats,
            errors: memberResult.errors,
          }
        : null,
      metrics: metricsResult
        ? {
            success: metricsResult.success,
            snapshot: metricsResult.snapshot,
            error: metricsResult.error,
          }
        : null,
      revenue: revenueResult
        ? {
            success: revenueResult.success,
            snapshot: revenueResult.snapshot,
            error: revenueResult.error,
          }
        : null,
    })
  } catch (error) {
    console.error('[sync-skool] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
