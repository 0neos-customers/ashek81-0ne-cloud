/**
 * Run SQL migration against Supabase
 *
 * Usage: bun scripts/run-migration.ts [sql-file]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Usage: bun scripts/run-migration.ts <sql-file>')
  console.error('Example: bun scripts/run-migration.ts packages/db/schemas/skool-metrics.sql')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  const filePath = resolve(process.cwd(), sqlFile)
  console.log(`Reading SQL from: ${filePath}`)

  const sql = readFileSync(filePath, 'utf-8')
  console.log(`Executing ${sql.length} characters of SQL...`)

  // Split by semicolon and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements`)

  let success = 0
  let failed = 0

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
      if (error) {
        // Try direct query if exec_sql doesn't exist
        const { error: queryError } = await supabase.from('_exec').select().limit(0)
        console.error(`Statement failed: ${statement.substring(0, 50)}...`)
        console.error(`Error: ${error.message}`)
        failed++
      } else {
        success++
      }
    } catch (err) {
      console.error(`Statement failed: ${statement.substring(0, 50)}...`)
      failed++
    }
  }

  console.log(`\nResults: ${success} succeeded, ${failed} failed`)
}

runMigration().catch(console.error)
