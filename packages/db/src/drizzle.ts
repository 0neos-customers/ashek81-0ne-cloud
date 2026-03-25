import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export function createDb() {
  const sql = neon(process.env.NEON_POSTGRES_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

export type Db = ReturnType<typeof createDb>
