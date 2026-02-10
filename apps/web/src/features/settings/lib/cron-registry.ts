/**
 * Cron Registry
 *
 * Central registry of all scheduled sync jobs with metadata.
 * Used by the Schedules tab to display and trigger sync jobs.
 */

import type { SyncType } from '@/lib/sync-log'

// =============================================================================
// TYPES
// =============================================================================

export interface CronJob {
  /** Unique identifier for the cron job (used for API calls) */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this sync does */
  description: string
  /** Human-readable schedule (e.g., "Daily at 5:00 AM") */
  schedule: string
  /** API endpoint to trigger the sync */
  endpoint: string
  /** Corresponding sync_type in the activity log */
  syncType: SyncType
}

export interface CronJobWithStatus extends CronJob {
  /** Last run information from sync_activity_log */
  lastRun: {
    startedAt: string
    status: 'running' | 'completed' | 'failed'
    recordsSynced: number
    durationSeconds: number | null
    errorMessage: string | null
  } | null
}

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * All registered cron jobs in the system
 */
export const CRON_REGISTRY: CronJob[] = [
  {
    id: 'sync-ghl',
    name: 'GHL Contacts',
    description: 'Sync contacts from GoHighLevel CRM',
    schedule: 'Daily at 5:00 AM',
    endpoint: '/api/cron/sync-ghl',
    syncType: 'ghl_contacts',
  },
  {
    id: 'sync-ghl-payments',
    name: 'GHL Payments',
    description: 'Sync payment transactions from GoHighLevel',
    schedule: 'Daily at 6:00 AM',
    endpoint: '/api/cron/sync-ghl-payments',
    syncType: 'ghl_payments',
  },
  {
    id: 'sync-skool',
    name: 'Skool Members',
    description: 'Sync Skool community members',
    schedule: 'Daily at 4:00 AM',
    endpoint: '/api/cron/sync-skool',
    syncType: 'skool',
  },
  {
    id: 'sync-about-analytics',
    name: 'Skool Analytics',
    description: 'Sync about page visitor data from Skool',
    schedule: 'Daily at 3:00 AM',
    endpoint: '/api/cron/sync-about-analytics',
    syncType: 'skool_analytics',
  },
  {
    id: 'sync-member-history',
    name: 'Member History',
    description: 'Sync member growth history snapshots',
    schedule: 'Daily at 3:30 AM',
    endpoint: '/api/cron/sync-member-history',
    syncType: 'skool_member_history',
  },
  {
    id: 'sync-meta',
    name: 'Meta Ads',
    description: 'Sync Facebook/Instagram ad metrics',
    schedule: 'Daily at 2:00 AM',
    endpoint: '/api/cron/sync-meta',
    syncType: 'meta',
  },
  {
    id: 'skool-post-scheduler',
    name: 'Skool Posts',
    description: 'Publish scheduled community posts',
    schedule: 'Every 15 minutes',
    endpoint: '/api/cron/skool-post-scheduler',
    syncType: 'skool_posts',
  },
]

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a cron job by its ID
 */
export function getCronById(id: string): CronJob | undefined {
  return CRON_REGISTRY.find((cron) => cron.id === id)
}

/**
 * Get a cron job by its sync type
 */
export function getCronBySyncType(syncType: SyncType): CronJob | undefined {
  return CRON_REGISTRY.find((cron) => cron.syncType === syncType)
}

/**
 * Check if a cron ID is valid
 */
export function isValidCronId(id: string): boolean {
  return CRON_REGISTRY.some((cron) => cron.id === id)
}

/**
 * Get all cron IDs
 */
export function getAllCronIds(): string[] {
  return CRON_REGISTRY.map((cron) => cron.id)
}
