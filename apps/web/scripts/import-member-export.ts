/**
 * Import Skool Member Export CSV
 *
 * This script imports member data from Skool's export_plus format and:
 * 1. Updates skool_members table with additional fields (ACE score, attribution, etc.)
 * 2. Recalculates accurate daily member counts based on exact join dates
 *
 * Usage:
 *   bun run scripts/import-member-export.ts [csv-path]
 *   bun run scripts/import-member-export.ts --dry-run [csv-path]
 *
 * The script will:
 * - Parse the CSV and validate structure
 * - Report on data quality and gaps
 * - Ask for confirmation before writing to database
 */

import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
// Note: Run with: cd packages/db && bun run ../../apps/web/scripts/import-member-export.ts

// =============================================================================
// CONFIG
// =============================================================================

const DEFAULT_CSV_PATH =
  '/Users/jimmyfuentes/Desktop/export_plus_active_20260206_123817.csv'
const GROUP_SLUG = 'fruitful'

// Parse command line args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const csvPath = args.find((a) => !a.startsWith('--')) || DEFAULT_CSV_PATH

// Load environment - works from packages/db or apps/web
let envPath: URL
try {
  envPath = new URL('../.env.local', import.meta.url) // apps/web/scripts
  if (!fs.existsSync(envPath)) throw new Error()
} catch {
  envPath = new URL('../../apps/web/.env.local', import.meta.url) // packages/db
}
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in apps/web/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// =============================================================================
// CSV PARSING
// =============================================================================

interface MemberRow {
  ID: string
  'First Name': string
  'Last Name': string
  Name: string
  Email: string
  Tags: string
  'Skool Profile URL': string
  Points: string
  Level: string
  'ACE Score': string
  'ACE Score Explanation': string
  'Group ID': string
  'Last Offline': string
  'Approved At': string
  'Billing Declined': string
  'Billing Canceled': string
  Churned: string
  'Lifespan Days': string
  'Removed At': string
  'Affiliate Percent at Join': string
  'Affiliate User': string
  'Total Referrals': string
  'Approved By': string
  'Number of Requests': string
  'Request Location': string
  Attribution: string
  'Attribution Source': string
  'Member Metadata MBME': string
  'Member Metadata MBSLTV': string
  'MMBP Currency': string
  'MMBP Amount': string
  'MMBP Recurring Interval': string
  'Metadata MSBS': string
  'Number of Generic Posts': string
  'MRR Status': string
  'Survey Question 1': string
  'Survey Answer 1': string
  'Survey Question 2': string
  'Survey Answer 2': string
  'Survey Question 3': string
  'Survey Answer 3': string
  Role: string
  Bio: string
  'Facebook Link': string
  'Instagram Link': string
  'LinkedIn Link': string
  'Twitter Link': string
  'Website Link': string
  'YouTube Link': string
  Location: string
  'Myers Briggs': string
  'Picture Bubble': string
  'Picture Profile': string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): MemberRow[] {
  const lines = text.split('\n')
  const header = parseCSVLine(lines[0])
  const rows: MemberRow[] = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i])
      const row: Record<string, string> = {}
      header.forEach((h, idx) => (row[h] = values[idx] || ''))
      rows.push(row as MemberRow)
    }
  }
  return rows
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

function normalizeAttribution(
  attribution: string,
  source: string
): string | null {
  // Combine attribution and source into a normalized value
  if (source) {
    // Extract domain from source (e.g., "facebook.com" -> "facebook")
    const domain = source.replace(/\.com$/, '').toLowerCase()
    if (['facebook', 'instagram', 'threads', 'google'].includes(domain)) {
      return domain
    }
    if (source === 'discovery_group_link') return 'discovery'
    if (source === 'user_profile_page') return 'profile'
    if (source === 'internal_link') return 'internal'
    return source
  }

  if (attribution) {
    if (attribution === 'external_link') return 'external'
    if (attribution === 'direct') return 'direct'
    if (attribution === 'affiliate') return 'affiliate'
    if (attribution === 'invite') return 'invite'
    if (attribution === 'skool') return 'discovery'
    return attribution
  }

  return null
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

async function updateSkoolMembers(members: MemberRow[]): Promise<{
  updated: number
  inserted: number
  errors: number
}> {
  let updated = 0
  let inserted = 0
  let errors = 0

  // Process in batches of 100
  const batchSize = 100
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize)

    const rows = batch.map((m) => ({
      skool_user_id: m.ID,
      skool_username: m.Name,
      display_name: `${m['First Name']} ${m['Last Name']}`.trim() || null,
      email: m.Email || m['Member Metadata MBME'] || null,
      bio: m.Bio || null,
      location: m.Location || m['Request Location'] || null,
      profile_image: m['Picture Profile'] || null,
      social_links: JSON.stringify({
        facebook: m['Facebook Link'] || null,
        instagram: m['Instagram Link'] || null,
        linkedin: m['LinkedIn Link'] || null,
        twitter: m['Twitter Link'] || null,
        website: m['Website Link'] || null,
        youtube: m['YouTube Link'] || null,
      }),
      group_slug: GROUP_SLUG,
      member_since: parseDate(m['Approved At'])?.toISOString() || null,
      last_online: parseDate(m['Last Offline'])?.toISOString() || null,
      attribution_source: normalizeAttribution(
        m.Attribution,
        m['Attribution Source']
      ),
      level: parseInt(m.Level) || 1,
      points: parseInt(m.Points) || 0,
      // New fields from export
      ace_score: m['ACE Score'] || null,
      ace_score_explanation: m['ACE Score Explanation'] || null,
      lifespan_days: parseInt(m['Lifespan Days']) || null,
      role: m.Role || 'member',
      posts_count: parseInt(m['Number of Generic Posts']) || 0,
      referrals_count: parseInt(m['Total Referrals']) || 0,
      mrr_status: m['MRR Status'] || null,
      updated_at: new Date().toISOString(),
    }))

    if (dryRun) {
      console.log(`[DRY RUN] Would upsert ${rows.length} members`)
      updated += rows.length
    } else {
      const { error, data } = await supabase
        .from('skool_members')
        .upsert(rows, { onConflict: 'skool_user_id', ignoreDuplicates: false })

      if (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error.message)
        errors += batch.length
      } else {
        updated += batch.length
      }
    }
  }

  return { updated, inserted, errors }
}

async function recalculateDailyMemberCounts(
  members: MemberRow[]
): Promise<{ days: number; errors: number }> {
  // Get all join dates
  const joinDates = members
    .map((m) => parseDate(m['Approved At']))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  if (joinDates.length === 0) {
    console.error('No valid join dates found')
    return { days: 0, errors: 1 }
  }

  const earliestDate = joinDates[0]
  const today = new Date()

  // Count members by join date
  const joinsByDate: Record<string, number> = {}
  members.forEach((m) => {
    const date = parseDate(m['Approved At'])
    if (date) {
      const dateStr = date.toISOString().split('T')[0]
      joinsByDate[dateStr] = (joinsByDate[dateStr] || 0) + 1
    }
  })

  console.log(`\nBuilding daily counts from ${earliestDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`)
  console.log(`Total join dates found: ${Object.keys(joinsByDate).length}`)

  // Build daily counts
  const dailyRows: Array<{
    group_slug: string
    date: string
    total_members: number
    new_members: number
    source: string
    updated_at: string
  }> = []

  let runningTotal = 0
  const currentDate = new Date(earliestDate)

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const newMembers = joinsByDate[dateStr] || 0
    runningTotal += newMembers

    dailyRows.push({
      group_slug: GROUP_SLUG,
      date: dateStr,
      total_members: runningTotal,
      new_members: newMembers,
      source: 'csv_export',
      updated_at: new Date().toISOString(),
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  console.log(`Generated ${dailyRows.length} daily records`)
  console.log(`Final total: ${runningTotal} members`)

  if (dryRun) {
    console.log(`[DRY RUN] Would upsert ${dailyRows.length} daily records`)
    // Show sample
    console.log('\nSample records:')
    dailyRows.slice(0, 5).forEach((r) => console.log(`  ${r.date}: ${r.total_members} total (+${r.new_members})`))
    console.log('  ...')
    dailyRows.slice(-5).forEach((r) => console.log(`  ${r.date}: ${r.total_members} total (+${r.new_members})`))
    return { days: dailyRows.length, errors: 0 }
  }

  // Upsert in batches
  let errors = 0
  const batchSize = 100
  for (let i = 0; i < dailyRows.length; i += batchSize) {
    const batch = dailyRows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('skool_members_daily')
      .upsert(batch, { onConflict: 'group_slug,date' })

    if (error) {
      console.error(`Daily batch ${i / batchSize + 1} error:`, error.message)
      errors++
    }
  }

  return { days: dailyRows.length, errors }
}

// =============================================================================
// MIGRATION: Add new columns to skool_members
// =============================================================================

async function ensureColumnsExist(): Promise<boolean> {
  // Check if ace_score column exists by querying
  const { error } = await supabase
    .from('skool_members')
    .select('ace_score')
    .limit(1)

  if (error && error.message.includes('ace_score')) {
    console.log('\n⚠️  Missing columns detected. Please run the following SQL:')
    console.log(`
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS ace_score TEXT;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS ace_score_explanation TEXT;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS lifespan_days INTEGER;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS mrr_status TEXT;
`)
    return false
  }
  return true
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=' .repeat(60))
  console.log('Skool Member Export Import')
  console.log('=' .repeat(60))

  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n')
  }

  // Read and parse CSV
  console.log(`\nReading: ${csvPath}`)
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`)
    process.exit(1)
  }

  const csv = fs.readFileSync(csvPath, 'utf-8')
  const members = parseCSV(csv)
  console.log(`Parsed ${members.length} members`)

  // Validate data
  const withJoinDate = members.filter((m) => parseDate(m['Approved At']))
  console.log(`Members with valid join date: ${withJoinDate.length}`)

  if (withJoinDate.length === 0) {
    console.error('No members with valid join dates found')
    process.exit(1)
  }

  // Attribution breakdown
  const byAttribution: Record<string, number> = {}
  members.forEach((m) => {
    const attr = normalizeAttribution(m.Attribution, m['Attribution Source']) || 'unknown'
    byAttribution[attr] = (byAttribution[attr] || 0) + 1
  })
  console.log('\nAttribution breakdown:')
  Object.entries(byAttribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`))

  // Check for required columns
  if (!dryRun) {
    const columnsExist = await ensureColumnsExist()
    if (!columnsExist) {
      console.log('\n❌ Please run the migration SQL above, then re-run this script.')
      process.exit(1)
    }
  }

  // Confirmation
  if (!dryRun) {
    console.log('\n⚠️  This will update the database with:')
    console.log(`   - ${members.length} member records (upsert)`)
    console.log(`   - ~${Math.ceil((Date.now() - parseDate(withJoinDate[0]['Approved At'])!.getTime()) / 86400000)} daily count records`)
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...')
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  // Update skool_members
  console.log('\n📊 Updating skool_members table...')
  const memberResult = await updateSkoolMembers(members)
  console.log(`   Updated: ${memberResult.updated}`)
  console.log(`   Errors: ${memberResult.errors}`)

  // Recalculate daily counts
  console.log('\n📈 Recalculating daily member counts...')
  const dailyResult = await recalculateDailyMemberCounts(members)
  console.log(`   Days: ${dailyResult.days}`)
  console.log(`   Errors: ${dailyResult.errors}`)

  console.log('\n✅ Import complete!')
}

main().catch(console.error)
