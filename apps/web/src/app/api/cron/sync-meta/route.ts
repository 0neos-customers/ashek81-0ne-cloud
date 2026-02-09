import { NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import { SyncLogger } from '@/lib/sync-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface MetaInsightsResponse {
  data: Array<{
    date_start: string
    date_stop: string
    spend: string
    impressions: string
    clicks: string
    cpm: string
    cpc: string
    ctr: string
    reach?: string
    frequency?: string
    unique_clicks?: string
    inline_link_clicks?: string
    actions?: Array<{ action_type?: string; value?: string }>
    cost_per_action_type?: Array<{ action_type?: string; value?: string }>
    purchase_roas?: Array<{ action_type?: string; value?: string }>
    campaign_id?: string
    campaign_name?: string
    adset_id?: string
    adset_name?: string
    ad_id?: string
    ad_name?: string
  }>
  paging?: {
    cursors: {
      before: string
      after: string
    }
    next?: string
  }
}

async function fetchPagedInsights(startUrl: string, maxPages: number) {
  const all: MetaInsightsResponse['data'] = []
  let nextUrl: string | undefined = startUrl
  let pageCount = 0

  while (nextUrl && pageCount < maxPages) {
    const response = await fetch(nextUrl)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Meta API error: ${response.status} - ${error}`)
    }

    const insights: MetaInsightsResponse = await response.json()
    pageCount += 1
    all.push(...insights.data)
    nextUrl = insights.paging?.next
  }

  if (pageCount >= maxPages) {
    console.warn('Meta sync stopped early due to page limit.')
  }

  return all
}

function sumActionValues(
  items: Array<{ action_type?: string; value?: string }> | undefined,
  actionTypes: string[]
) {
  if (!items || items.length === 0) return 0
  return items.reduce((sum, item) => {
    if (item.action_type && actionTypes.includes(item.action_type)) {
      return sum + (parseFloat(item.value || '0') || 0)
    }
    return sum
  }, 0)
}

function getActionValue(
  items: Array<{ action_type?: string; value?: string }> | undefined,
  actionTypes: string[]
) {
  if (!items || items.length === 0) return 0
  const match = items.find((item) => item.action_type && actionTypes.includes(item.action_type))
  return match ? (parseFloat(match.value || '0') || 0) : 0
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = process.env.META_ACCESS_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: 'Meta credentials not configured' },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  const { searchParams } = new URL(request.url)
  const backfill = searchParams.get('backfill') === 'true'
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const daysParam = searchParams.get('days')

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const defaultDateStr = yesterday.toISOString().split('T')[0]

  let startDate = startDateParam
  let endDate = endDateParam || defaultDateStr

  if (backfill && !startDate) {
    const days = Math.max(1, parseInt(daysParam || '90', 10))
    const start = new Date()
    start.setDate(start.getDate() - days)
    startDate = start.toISOString().split('T')[0]
  }

  if (!startDate) {
    startDate = defaultDateStr
  }

  // Start sync logging
  const syncLog = new SyncLogger('meta')
  await syncLog.start({ backfill, startDate, endDate })

  try {

    const insightsUrl = new URL(
      `https://graph.facebook.com/v18.0/${adAccountId}/insights`
    )
    insightsUrl.searchParams.set('access_token', accessToken)
    insightsUrl.searchParams.set('level', 'ad')
    insightsUrl.searchParams.set('time_range', JSON.stringify({
      since: startDate,
      until: endDate,
    }))
    insightsUrl.searchParams.set('time_increment', '1')
    insightsUrl.searchParams.set('limit', '500')
    // Match Ads Manager defaults: 7-day click / 1-day view attribution
    insightsUrl.searchParams.set('action_attribution_windows', '["7d_click","1d_view"]')
    insightsUrl.searchParams.set('action_report_time', 'conversion')
    insightsUrl.searchParams.set(
      'fields',
      [
        'campaign_id',
        'campaign_name',
        'adset_id',
        'adset_name',
        'ad_id',
        'ad_name',
        'spend',
        'impressions',
        'clicks',
        'cpm',
        'cpc',
        'ctr',
        'reach',
        'frequency',
        'unique_clicks',
        'inline_link_clicks',
        'actions',
        'cost_per_action_type',
        'purchase_roas',
      ].join(',')
    )

    let synced = 0
    let errors = 0

    const adInsights = await fetchPagedInsights(insightsUrl.toString(), 200)

    for (const insight of adInsights) {
      try {
        let campaignId = null

        if (insight.campaign_name) {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('id')
            .eq('name', insight.campaign_name)
            .single()

          if (campaign) {
            campaignId = campaign.id
          }
        }

        const landingPageViews = sumActionValues(insight.actions, ['landing_page_view'])
        // Match Ads Manager "Results" for complete_registration
        const completedRegistrations = sumActionValues(insight.actions, [
          'complete_registration',
        ])
        const conversions = completedRegistrations
        const costPerConversion = getActionValue(insight.cost_per_action_type, [
          'complete_registration',
        ])
        const roas = getActionValue(insight.purchase_roas, [
          'omni_purchase',
          'purchase',
          'offsite_conversion.fb_pixel_purchase',
        ])

        const { error: upsertError } = await supabase
          .from('ad_metrics')
          .upsert(
            {
              date: insight.date_start,
              platform: 'meta',
              campaign_id: campaignId,
              campaign_meta_id: insight.campaign_id || null,
              campaign_name: insight.campaign_name || null,
              adset_id: insight.adset_id || null,
              adset_name: insight.adset_name || null,
              ad_id: insight.ad_id || null,
              ad_name: insight.ad_name || null,
              spend: parseFloat(insight.spend) || 0,
              impressions: parseInt(insight.impressions) || 0,
              clicks: parseInt(insight.clicks) || 0,
              reach: parseInt(insight.reach || '0') || 0,
              frequency: parseFloat(insight.frequency || '0') || 0,
              unique_clicks: parseInt(insight.unique_clicks || '0') || 0,
              link_clicks: parseInt(insight.inline_link_clicks || '0') || 0,
              landing_page_views: landingPageViews,
              completed_registrations: completedRegistrations,
              conversions,
              cost_per_conversion: costPerConversion,
              roas,
              cpm: parseFloat(insight.cpm) || 0,
              cpc: parseFloat(insight.cpc) || 0,
              ctr: parseFloat(insight.ctr) || 0,
            },
            {
              onConflict: 'date,platform,adset_id,ad_id',
            }
          )

        if (upsertError) {
          console.error('Ad metrics upsert error:', upsertError)
          errors++
          continue
        }

        synced++
      } catch (insightError) {
        console.error('Error processing insight:', insightError)
        errors++
      }
    }

    const accountUrl = new URL(
      `https://graph.facebook.com/v18.0/${adAccountId}/insights`
    )
    accountUrl.searchParams.set('access_token', accessToken)
    accountUrl.searchParams.set('time_range', JSON.stringify({
      since: startDate,
      until: endDate,
    }))
    accountUrl.searchParams.set('level', 'account')
    accountUrl.searchParams.set('time_increment', '1')
    accountUrl.searchParams.set('limit', '500')
    accountUrl.searchParams.set('action_attribution_windows', '["7d_click","1d_view"]')
    accountUrl.searchParams.set('action_report_time', 'conversion')
    accountUrl.searchParams.set(
      'fields',
      [
        'spend',
        'impressions',
        'clicks',
        'reach',
        'frequency',
        'unique_clicks',
      ].join(',')
    )

    const accountInsights = await fetchPagedInsights(accountUrl.toString(), 50)

    for (const insight of accountInsights) {
      const { error: accountUpsertError } = await supabase
        .from('meta_account_daily')
        .upsert(
          {
            date: insight.date_start,
            platform: 'meta',
            reach: parseInt(insight.reach || '0') || 0,
            frequency: parseFloat(insight.frequency || '0') || 0,
            unique_clicks: parseInt(insight.unique_clicks || '0') || 0,
            impressions: parseInt(insight.impressions) || 0,
            clicks: parseInt(insight.clicks) || 0,
            spend: parseFloat(insight.spend) || 0,
          },
          { onConflict: 'date,platform' }
        )

      if (accountUpsertError) {
        console.error('Meta account daily upsert error:', accountUpsertError)
        errors++
      }
    }

    // ============================================
    // Sync Facebook Ads expenses (daily entries)
    // Creates expense entries for each day's ad spend
    // ============================================
    let expensesSynced = 0
    let expensesErrors = 0

    for (const insight of accountInsights) {
      const dailySpend = parseFloat(insight.spend) || 0
      const syncDate = insight.date_start

      // Skip days with no spend
      if (dailySpend <= 0) continue

      try {
        // Check if expense already exists for this date
        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('category', 'Facebook Ads')
          .eq('meta_sync_date', syncDate)
          .eq('is_system', true)
          .single()

        if (existing) {
          // Update existing expense
          const { error: updateError } = await supabase
            .from('expenses')
            .update({
              amount: dailySpend,
              name: `Facebook Ads - ${syncDate}`,
            })
            .eq('id', existing.id)

          if (updateError) {
            console.error('Facebook Ads expense update error:', updateError)
            expensesErrors++
          } else {
            expensesSynced++
          }
        } else {
          // Insert new expense
          const { error: insertError } = await supabase
            .from('expenses')
            .insert({
              name: `Facebook Ads - ${syncDate}`,
              category: 'Facebook Ads',
              amount: dailySpend,
              frequency: 'one_time',
              expense_date: syncDate,
              is_active: true,
              is_system: true,
              meta_sync_date: syncDate,
            })

          if (insertError) {
            console.error('Facebook Ads expense insert error:', insertError)
            expensesErrors++
          } else {
            expensesSynced++
          }
        }
      } catch (expError) {
        console.error('Error syncing Facebook Ads expense:', expError)
        expensesErrors++
      }
    }

    // Complete sync logging
    await syncLog.complete(synced, {
      errors,
      expenses: { synced: expensesSynced, errors: expensesErrors },
    })

    return NextResponse.json({
      success: true,
      synced,
      errors,
      expenses: {
        synced: expensesSynced,
        errors: expensesErrors,
      },
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Meta sync error:', error)
    await syncLog.fail(String(error))
    return NextResponse.json(
      { error: 'Meta sync failed', details: String(error) },
      { status: 500 }
    )
  }
}
