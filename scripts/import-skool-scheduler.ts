/**
 * Import Skool Post Scheduler data from CSV
 *
 * This script imports scheduler slots and post content from the existing
 * Google Sheets-based Skool Post Scheduler into Supabase.
 *
 * Source CSV files:
 * - Scheduler.csv: 7 schedule slots (day/time combinations)
 * - Posts.csv: 88 post content variations
 *
 * Run with: bun run scripts/import-skool-scheduler.ts
 *
 * Required env vars:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (needed for direct insert, bypassing RLS)
 */

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const SCHEDULER_CSV_PATH = '/Users/jimmyfuentes/Desktop/Skool Post Scheduler/Skool Post Scheduler - Scheduler.csv'
const POSTS_CSV_PATH = '/Users/jimmyfuentes/Desktop/Skool Post Scheduler/Skool Post Scheduler - Posts.csv'

// Load environment variables from apps/web/.env.local if running from project root
const envPath = resolve(__dirname, '../apps/web/.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.trim()
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING')
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'MISSING')
  console.error('\nMake sure these are set in apps/web/.env.local or as environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

interface SchedulerRow {
  Status: string
  Category: string
  Day: string
  Time: string
  'Last Run Date': string
  Note: string
}

interface PostRow {
  Status: string
  Category: string
  Day: string
  Time: string
  Variation: string
  Title: string
  Post: string
  'Image URL': string
  'Video URL': string
  'Last Used': string
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** Map day names to day_of_week integers (0 = Sunday) */
const dayMap: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

/** Convert time from "0900" or "1855" to "09:00" or "18:55" */
function formatTime(time: string): string {
  const padded = time.padStart(4, '0')
  return `${padded.slice(0, 2)}:${padded.slice(2)}`
}

/** Parse a date string like "2025-12-14" or empty string */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') {
    return null
  }
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return null
    }
    return date.toISOString()
  } catch {
    return null
  }
}

/** Clean up Google Drive image URLs to direct download format */
function cleanImageUrl(url: string): string | null {
  if (!url || url.trim() === '') {
    return null
  }
  // Google Drive URLs are already in uc?id= format from the CSV
  return url.trim()
}

// -----------------------------------------------------------------------------
// Import Functions
// -----------------------------------------------------------------------------

async function importSchedulers(): Promise<number> {
  console.log('\n--- Importing Schedulers ---')

  if (!existsSync(SCHEDULER_CSV_PATH)) {
    console.error(`Scheduler CSV not found at: ${SCHEDULER_CSV_PATH}`)
    return 0
  }

  const csv = readFileSync(SCHEDULER_CSV_PATH, 'utf-8')
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as SchedulerRow[]

  console.log(`Found ${records.length} scheduler rows in CSV`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const row of records) {
    // Skip rows with missing required fields
    if (!row.Category || !row.Day || !row.Time) {
      console.log(`  Skipping row with missing data: ${JSON.stringify(row)}`)
      skipCount++
      continue
    }

    const dayOfWeek = dayMap[row.Day]
    if (dayOfWeek === undefined) {
      console.log(`  Skipping row with invalid day: ${row.Day}`)
      skipCount++
      continue
    }

    const scheduler = {
      group_slug: 'fruitful',
      category: row.Category.trim(),
      category_id: null, // Will be populated later via Skool API
      day_of_week: dayOfWeek,
      time: formatTime(row.Time),
      is_active: row.Status?.toLowerCase() === 'active',
      last_run_at: parseDate(row['Last Run Date']),
      note: row.Note?.trim() || null,
    }

    console.log(`  Importing: ${scheduler.category} - ${row.Day} @ ${scheduler.time}`)

    // Use upsert to avoid duplicates on (category, day_of_week, time)
    const { error } = await supabase
      .from('skool_scheduled_posts')
      .upsert(scheduler, {
        onConflict: 'category,day_of_week,time',
        ignoreDuplicates: false
      })

    if (error) {
      console.error(`    Error: ${error.message}`)
      errorCount++
    } else {
      successCount++
    }
  }

  console.log(`\nSchedulers import complete:`)
  console.log(`  - Success: ${successCount}`)
  console.log(`  - Skipped: ${skipCount}`)
  console.log(`  - Errors: ${errorCount}`)

  return successCount
}

async function importPosts(): Promise<number> {
  console.log('\n--- Importing Posts ---')

  if (!existsSync(POSTS_CSV_PATH)) {
    console.error(`Posts CSV not found at: ${POSTS_CSV_PATH}`)
    return 0
  }

  const csv = readFileSync(POSTS_CSV_PATH, 'utf-8')
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as PostRow[]

  console.log(`Found ${records.length} post rows in CSV`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  // Process in batches for better performance
  const batchSize = 20
  const posts = []

  for (const row of records) {
    // Skip rows with missing required fields
    if (!row.Category || !row.Day || !row.Time || !row.Title || !row.Post) {
      console.log(`  Skipping row with missing data: Title="${row.Title?.substring(0, 30)}..."`)
      skipCount++
      continue
    }

    const dayOfWeek = dayMap[row.Day]
    if (dayOfWeek === undefined) {
      console.log(`  Skipping row with invalid day: ${row.Day}`)
      skipCount++
      continue
    }

    const post = {
      category: row.Category.trim(),
      day_of_week: dayOfWeek,
      time: formatTime(row.Time),
      title: row.Title.trim(),
      body: row.Post.trim(),
      image_url: cleanImageUrl(row['Image URL']),
      video_url: cleanImageUrl(row['Video URL']),
      is_active: row.Status?.toLowerCase() === 'active',
      last_used_at: parseDate(row['Last Used']),
      use_count: 0,
    }

    posts.push(post)
  }

  console.log(`\nInserting ${posts.length} posts in batches of ${batchSize}...`)

  // Insert in batches
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(posts.length / batchSize)

    process.stdout.write(`  Batch ${batchNum}/${totalBatches}... `)

    const { error, data } = await supabase
      .from('skool_post_library')
      .insert(batch)
      .select('id')

    if (error) {
      console.log(`Error: ${error.message}`)
      errorCount += batch.length
    } else {
      console.log(`OK (${data?.length || batch.length} rows)`)
      successCount += batch.length
    }
  }

  console.log(`\nPosts import complete:`)
  console.log(`  - Success: ${successCount}`)
  console.log(`  - Skipped: ${skipCount}`)
  console.log(`  - Errors: ${errorCount}`)

  return successCount
}

async function verifyImport(): Promise<void> {
  console.log('\n--- Verifying Import ---')

  // Count schedulers
  const { count: schedCount, error: schedError } = await supabase
    .from('skool_scheduled_posts')
    .select('*', { count: 'exact', head: true })

  if (schedError) {
    console.error(`Error counting schedulers: ${schedError.message}`)
  } else {
    console.log(`Schedulers in database: ${schedCount}`)
  }

  // Count posts
  const { count: postCount, error: postError } = await supabase
    .from('skool_post_library')
    .select('*', { count: 'exact', head: true })

  if (postError) {
    console.error(`Error counting posts: ${postError.message}`)
  } else {
    console.log(`Posts in database: ${postCount}`)
  }

  // Show breakdown by category
  const { data: categoryData, error: catError } = await supabase
    .from('skool_post_library')
    .select('category')

  if (!catError && categoryData) {
    const categoryCounts: Record<string, number> = {}
    for (const row of categoryData) {
      categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1
    }

    console.log('\nPosts by category:')
    for (const [cat, count] of Object.entries(categoryCounts).sort()) {
      console.log(`  - ${cat}: ${count}`)
    }
  }

  // Show scheduler summary
  const { data: schedData, error: schedDataError } = await supabase
    .from('skool_scheduled_posts')
    .select('category, day_of_week, time, is_active')
    .order('day_of_week')
    .order('time')

  if (!schedDataError && schedData) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    console.log('\nSchedule slots:')
    for (const sched of schedData) {
      const status = sched.is_active ? 'Active' : 'Draft'
      console.log(`  - ${days[sched.day_of_week]} ${sched.time}: ${sched.category} (${status})`)
    }
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('SKOOL POST SCHEDULER - DATA IMPORT')
  console.log('='.repeat(60))
  console.log(`\nTimestamp: ${new Date().toISOString()}`)
  console.log(`Supabase URL: ${supabaseUrl}`)

  // Check source files
  console.log('\nSource files:')
  console.log(`  Scheduler CSV: ${existsSync(SCHEDULER_CSV_PATH) ? 'Found' : 'NOT FOUND'}`)
  console.log(`  Posts CSV: ${existsSync(POSTS_CSV_PATH) ? 'Found' : 'NOT FOUND'}`)

  // Run imports
  const schedCount = await importSchedulers()
  const postCount = await importPosts()

  // Verify results
  await verifyImport()

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('IMPORT COMPLETE')
  console.log('='.repeat(60))
  console.log(`\nImported:`)
  console.log(`  - ${schedCount} scheduler slots`)
  console.log(`  - ${postCount} post variations`)
  console.log('\nNext steps:')
  console.log('  1. Verify data in Supabase dashboard')
  console.log('  2. Update category_id fields via Skool API')
  console.log('  3. Activate schedulers when ready')
}

main().catch((error) => {
  console.error('\nFatal error:', error)
  process.exit(1)
})
