import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

interface DateRangeResult {
  startDate: string
  endDate: string
}

function getDateRangeFromPeriod(period: string): DateRangeResult {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  let startDate: Date

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'mtd': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    }
    case 'lastMonth': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: new Date(thisMonth.getTime() - 1).toISOString().split('T')[0],
      }
    }
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'lifetime':
      startDate = new Date('2020-01-01')
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate,
  }
}

/**
 * Parse date range from request params
 * Priority: explicit startDate/endDate > period preset
 */
function parseDateRange(searchParams: URLSearchParams): DateRangeResult {
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

  // If explicit dates provided, use them
  if (startDateParam && endDateParam) {
    return { startDate: startDateParam, endDate: endDateParam }
  }

  // Fall back to period preset
  const period = searchParams.get('period') || 'mtd'
  return getDateRangeFromPeriod(period)
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || null
    // Note: sources parameter is accepted but not used for filtering expenses
    // Expenses (ad spend, tools, labor) are business costs not tied to individual
    // contact attribution sources. Use Overview or Funnel pages for source filtering.
    const sourcesParam = searchParams.get('sources')
    const sourcesProvided = sourcesParam ? sourcesParam.split(',').filter(Boolean).length > 0 : false

    // Parse date range from explicit params or period preset
    const { startDate, endDate } = parseDateRange(searchParams)
    const previousPeriodLength = new Date(endDate).getTime() - new Date(startDate).getTime()
    const previousStartDate = new Date(new Date(startDate).getTime() - previousPeriodLength)
      .toISOString()
      .split('T')[0]

    const supabase = createServerClient()

    // Fetch expense_categories for canonical display names
    const { data: expenseCategories } = await supabase
      .from('expense_categories')
      .select('name, color, is_system')

    // Build lookup map: lowercase category -> canonical display name & color
    const categoryCanonical = new Map<string, { name: string; color: string; isSystem: boolean }>()
    expenseCategories?.forEach((cat) => {
      categoryCanonical.set(cat.name.toLowerCase(), {
        name: cat.name,
        color: cat.color || '#6b7280',
        isSystem: cat.is_system || false,
      })
    })

    // Get expenses for current period (excluding Facebook Ads since we'll use ad_metrics)
    let expenseQuery = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .neq('category', 'Facebook Ads') // Exclude - we use ad_metrics instead

    if (category && category.toLowerCase() !== 'facebook ads') {
      expenseQuery = expenseQuery.eq('category', category)
    }

    const { data: currentExpenses } = await expenseQuery

    // Get expenses for previous period (excluding Facebook Ads)
    let prevExpenseQuery = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', previousStartDate)
      .lt('expense_date', startDate)
      .neq('category', 'Facebook Ads') // Exclude - we use ad_metrics instead

    if (category && category.toLowerCase() !== 'facebook ads') {
      prevExpenseQuery = prevExpenseQuery.eq('category', category)
    }

    const { data: previousExpenses } = await prevExpenseQuery

    // Get ad metrics for current period (source of truth for Facebook Ads)
    const { data: currentAdMetrics } = await supabase
      .from('ad_metrics')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    // Get ad metrics for previous period
    const { data: previousAdMetrics } = await supabase
      .from('ad_metrics')
      .select('*')
      .gte('date', previousStartDate)
      .lt('date', startDate)

    // Get daily aggregates for lead counts
    const { data: currentAggregates } = await supabase
      .from('daily_aggregates')
      .select('new_leads, new_vip, new_premium, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .is('campaign_id', null)
      .is('source', null)

    // Group expenses by category (case-insensitive)
    // Use canonical display names from expense_categories table
    const categoryMap = new Map<string, { current: number; previous: number; isSystem: boolean; displayName: string; color: string }>()

    // Helper to normalize category key (lowercase) and get canonical info
    const getCategoryKey = (cat: string) => cat.toLowerCase()
    const getCanonicalInfo = (catKey: string) => {
      const canonical = categoryCanonical.get(catKey)
      return canonical || { name: catKey.charAt(0).toUpperCase() + catKey.slice(1), color: '#6b7280', isSystem: false }
    }

    currentExpenses?.forEach((exp) => {
      const rawCat = exp.category || 'Other'
      const catKey = getCategoryKey(rawCat)
      if (!categoryMap.has(catKey)) {
        const canonical = getCanonicalInfo(catKey)
        categoryMap.set(catKey, { current: 0, previous: 0, isSystem: canonical.isSystem, displayName: canonical.name, color: canonical.color })
      }
      const entry = categoryMap.get(catKey)!
      entry.current += Number(exp.amount) || 0
    })

    previousExpenses?.forEach((exp) => {
      const rawCat = exp.category || 'Other'
      const catKey = getCategoryKey(rawCat)
      if (!categoryMap.has(catKey)) {
        const canonical = getCanonicalInfo(catKey)
        categoryMap.set(catKey, { current: 0, previous: 0, isSystem: canonical.isSystem, displayName: canonical.name, color: canonical.color })
      }
      const entry = categoryMap.get(catKey)!
      entry.previous += Number(exp.amount) || 0
    })

    // Calculate Facebook Ads spend from ad_metrics (source of truth for ad spend)
    const currentAdSpend = currentAdMetrics?.reduce((sum, m) => sum + (Number(m.spend) || 0), 0) || 0
    const previousAdSpend = previousAdMetrics?.reduce((sum, m) => sum + (Number(m.spend) || 0), 0) || 0

    // Add Facebook Ads as a category from ad_metrics (not from expenses table)
    if (currentAdSpend > 0 || previousAdSpend > 0) {
      const fbCanonical = getCanonicalInfo('facebook ads')
      categoryMap.set('facebook ads', {
        current: currentAdSpend,
        previous: previousAdSpend,
        isSystem: true, // Always mark as system since it's auto-synced from Meta
        displayName: fbCanonical.name,
        color: fbCanonical.color,
      })
    }

    const categories = Array.from(categoryMap.entries()).map(([key, data]) => ({
      id: key.replace(/\s+/g, '_'),
      name: data.displayName,
      amount: data.current,
      change: Number(calculateChange(data.current, data.previous).toFixed(1)),
      trend: data.current >= data.previous ? 'up' : (data.current < data.previous ? 'down' : 'neutral'),
      isSystem: data.isSystem, // Indicates if this is an auto-synced category (e.g., Facebook Ads)
      color: data.color, // Color from expense_categories table
    })).sort((a, b) => b.amount - a.amount) // Sort by amount descending

    // Group ad metrics by campaign/channel
    const channelMap = new Map<string, {
      spend: number
      leads: number
      clients: number
    }>()

    currentAdMetrics?.forEach((metric) => {
      const channel = metric.campaign_name || metric.campaign_id || 'Unknown'
      if (!channelMap.has(channel)) {
        channelMap.set(channel, { spend: 0, leads: 0, clients: 0 })
      }
      channelMap.get(channel)!.spend += Number(metric.spend) || 0
      channelMap.get(channel)!.leads += Number(metric.leads) || 0
      // Note: clients would need to come from a join with conversions data
    })

    const byChannel = Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      spend: data.spend,
      leads: data.leads,
      cpl: data.leads > 0 ? Number((data.spend / data.leads).toFixed(2)) : 0,
      clients: data.clients,
      cpc: data.clients > 0 ? Number((data.spend / data.clients).toFixed(2)) : 0,
    })).sort((a, b) => b.spend - a.spend)

    // Monthly trends
    // Facebook Ads comes from ad_metrics, other categories from expenses table
    const monthlyMap = new Map<string, {
      ads: number
      tools: number
      content: number
      team: number
      total: number
    }>()

    // Add Facebook Ads spend from ad_metrics by month
    currentAdMetrics?.forEach((metric) => {
      const month = metric.date.substring(0, 7) // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { ads: 0, tools: 0, content: 0, team: 0, total: 0 })
      }
      const entry = monthlyMap.get(month)!
      const spend = Number(metric.spend) || 0
      entry.ads += spend
      entry.total += spend
    })

    // Add other expenses (excluding Facebook Ads which comes from ad_metrics)
    currentExpenses?.forEach((exp) => {
      const month = exp.expense_date.substring(0, 7) // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { ads: 0, tools: 0, content: 0, team: 0, total: 0 })
      }
      const entry = monthlyMap.get(month)!
      const amount = Number(exp.amount) || 0
      entry.total += amount

      // Map categories to standard buckets
      const cat = (exp.category || '').toLowerCase()
      if (cat.includes('marketing') || cat.includes('advertising')) {
        entry.ads += amount
      } else if (cat.includes('software') || cat.includes('tool')) {
        entry.tools += amount
      } else if (cat.includes('content')) {
        entry.content += amount
      } else if (cat.includes('labor') || cat.includes('team') || cat.includes('contractor')) {
        entry.team += amount
      }
    })

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate totals
    const totalExpenses = categories.reduce((sum, c) => sum + c.amount, 0)
    const totalLeads = currentAggregates?.reduce((sum, a) => sum + (a.new_leads || 0), 0) || 0
    const totalClients = currentAggregates?.reduce((sum, a) => sum + (a.new_vip || 0) + (a.new_premium || 0), 0) || 0

    // Get ALL expenses for the list (including Facebook Ads for display)
    let allExpensesQuery = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    if (category) {
      allExpensesQuery = allExpensesQuery.eq('category', category)
    }

    const { data: allExpensesList } = await allExpensesQuery

    // Format individual expenses for the All Expenses tab
    // Use canonical display names from expense_categories
    const expenses = (allExpensesList || []).map((exp) => {
      const catKey = (exp.category || 'other').toLowerCase()
      const canonical = getCanonicalInfo(catKey)
      return {
        id: exp.id,
        name: exp.name || 'Unnamed',
        category: canonical.name, // Use canonical display name
        amount: Number(exp.amount) || 0,
        frequency: exp.frequency || 'one_time',
        isActive: exp.is_active !== false,
        isSystem: exp.is_system || false,
        startDate: exp.expense_date,
      }
    })

    const response = {
      summary: {
        totalExpenses,
        totalAdSpend: currentAdSpend,
        totalLeads,
        totalClients,
        costPerLead: totalLeads > 0 ? Number((currentAdSpend / totalLeads).toFixed(2)) : 0,
        costPerClient: totalClients > 0 ? Number((currentAdSpend / totalClients).toFixed(2)) : 0,
      },
      categories,
      byChannel,
      monthly,
      expenses, // Individual expense items for All Expenses tab
      period: {
        startDate,
        endDate,
        label: searchParams.get('period') || 'custom',
      },
      filters: {
        categories: Array.from(categoryMap.keys()).sort(),
      },
      // Document that source filtering doesn't apply to expenses
      ...(sourcesProvided && {
        sourceFilteringNote: 'Source filtering is not applicable to expenses. Expenses (ad spend, tools, labor) are business costs not tied to individual contact attribution sources.',
      }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('KPI Expenses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense data', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { description, amount, category, expense_date, frequency } = body

    // Validate required fields
    if (!description || !amount || !category || !expense_date) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, category, expense_date' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        name: description, // Map description to name column
        amount: Number(amount),
        category,
        expense_date,
        frequency: frequency || 'one_time',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert expense error:', error)
      return NextResponse.json(
        { error: 'Failed to add expense', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, expense: data })
  } catch (error) {
    console.error('Add expense error:', error)
    return NextResponse.json(
      { error: 'Failed to add expense', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT - Update an expense (all fields)
export async function PUT(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, description, amount, category, frequency, expense_date, vendor, notes } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    if (!description || !amount || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, category' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if expense exists and is not a system expense
    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('id, is_system')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'System expenses cannot be modified' },
        { status: 403 }
      )
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      name: description, // Map description to name column
      amount: Number(amount),
      category,
    }

    if (frequency) {
      updateData.frequency = frequency
    }
    if (expense_date) {
      updateData.expense_date = expense_date
    }
    if (vendor !== undefined) {
      updateData.vendor = vendor || null
    }
    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    // Update the expense
    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update expense error:', error)
      return NextResponse.json(
        { error: 'Failed to update expense', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, expense: data })
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { error: 'Failed to update expense', details: String(error) },
      { status: 500 }
    )
  }
}

// PATCH - Update specific fields on an expense (e.g., toggle isActive)
export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, is_active } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if expense exists and is not a system expense
    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('id, is_system')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'System expenses cannot be modified' },
        { status: 403 }
      )
    }

    // Update the expense
    const { data, error } = await supabase
      .from('expenses')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update expense error:', error)
      return NextResponse.json(
        { error: 'Failed to update expense', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, expense: data })
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { error: 'Failed to update expense', details: String(error) },
      { status: 500 }
    )
  }
}
