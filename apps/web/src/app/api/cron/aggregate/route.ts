import { NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()

    // Support ?date=YYYY-MM-DD for backfilling, otherwise use yesterday
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')

    let dateStr: string
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      dateStr = dateParam
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      dateStr = yesterday.toISOString().split('T')[0]
    }
    const startOfDay = `${dateStr}T00:00:00.000Z`
    const endOfDay = `${dateStr}T23:59:59.999Z`

    const { data: events } = await supabase
      .from('events')
      .select('event_type, event_data, source, campaign')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    const { data: contacts } = await supabase
      .from('contacts')
      .select('current_stage, source, campaign')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    const { data: adMetrics } = await supabase
      .from('ad_metrics')
      .select('spend, campaign_id')
      .eq('date', dateStr)

    const { data: revenue } = await supabase
      .from('revenue')
      .select('amount, type, campaign_id')
      .eq('transaction_date', dateStr)

    const aggregate = {
      date: dateStr,
      campaign_id: null,
      source: null,
      new_leads: contacts?.filter((c) => c.current_stage === 'lead').length || 0,
      new_hand_raisers: contacts?.filter((c) => c.current_stage === 'hand_raiser').length || 0,
      new_qualified: contacts?.filter((c) => c.current_stage === 'qualified').length || 0,
      new_vip: contacts?.filter((c) => c.current_stage === 'vip').length || 0,
      new_premium: contacts?.filter((c) => c.current_stage === 'premium').length || 0,
      new_funded: contacts?.filter((c) => c.current_stage === 'funded').length || 0,
      total_revenue: revenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      vip_revenue: revenue?.filter((r) => r.type === 'vip_setup').reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      premium_revenue: revenue?.filter((r) => r.type === 'premium').reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      success_fee_revenue: revenue?.filter((r) => r.type === 'success_fee').reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      ad_spend: adMetrics?.reduce((sum, m) => sum + Number(m.spend), 0) || 0,
      expenses: 0,
      total_funded_amount: events?.filter((e) => e.event_type === 'funded')
        .reduce((sum, e) => sum + (Number((e.event_data as Record<string, number>)?.amount) || 0), 0) || 0,
      funded_count: events?.filter((e) => e.event_type === 'funded').length || 0,
    }

    const { error: upsertError } = await supabase
      .from('daily_aggregates')
      .upsert(aggregate, {
        onConflict: 'date,campaign_id,source',
      })

    if (upsertError) {
      throw upsertError
    }

    const campaignIds = [...new Set([
      ...contacts?.map((c) => c.campaign).filter(Boolean) || [],
      ...adMetrics?.map((m) => m.campaign_id).filter(Boolean) || [],
    ])]

    for (const campaignId of campaignIds) {
      const campaignAggregate = {
        ...aggregate,
        campaign_id: campaignId,
        new_leads: contacts?.filter((c) => c.current_stage === 'lead' && c.campaign === campaignId).length || 0,
        new_hand_raisers: contacts?.filter((c) => c.current_stage === 'hand_raiser' && c.campaign === campaignId).length || 0,
        ad_spend: adMetrics?.filter((m) => m.campaign_id === campaignId).reduce((sum, m) => sum + Number(m.spend), 0) || 0,
      }

      await supabase.from('daily_aggregates').upsert(campaignAggregate, {
        onConflict: 'date,campaign_id,source',
      })
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      aggregate,
      campaignsProcessed: campaignIds.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Aggregate error:', error)
    return NextResponse.json(
      { error: 'Aggregation failed', details: String(error) },
      { status: 500 }
    )
  }
}
