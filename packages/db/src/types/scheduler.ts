// Skool Post Scheduler database types

/**
 * Execution status for scheduled posts
 */
export type SchedulerExecutionStatus = 'success' | 'failed' | 'skipped'

/**
 * Status for one-off scheduled posts
 * Workflow: draft → approved → pending (scheduled for auto-posting) → published
 */
export type OneOffPostStatus = 'pending' | 'draft' | 'approved' | 'published' | 'posted_manually' | 'failed' | 'cancelled'

/**
 * Status for post library items (approval workflow)
 */
export type PostLibraryStatus = 'draft' | 'approved' | 'active'

/**
 * Source tracking for post library items
 */
export type PostLibrarySource = 'manual' | 'api' | 'import'

/**
 * Day of week constants (0 = Sunday, 6 = Saturday)
 */
export const DAY_OF_WEEK = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
} as const

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK]

/**
 * Day names array for display (index matches day_of_week value)
 */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export type DayName = (typeof DAY_NAMES)[number]

/**
 * Variation group for flexible post matching (database row)
 */
export interface SkoolVariationGroup {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Schedule slot for auto-posting (database row)
 */
export interface SkoolScheduledPost {
  id: string
  groupSlug: string
  category: string
  categoryId: string | null
  dayOfWeek: DayOfWeek
  time: string // "HH:MM" format (24hr)
  variationGroupId: string | null // Reference to variation group for content
  isActive: boolean
  lastRunAt: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  // Joined data (optional)
  variationGroup?: SkoolVariationGroup | null
}

/**
 * Content item for rotation in the post library (database row)
 */
export interface SkoolPostLibraryItem {
  id: string
  category: string
  dayOfWeek: DayOfWeek | null // Now nullable (legacy, not used for matching)
  time: string | null // Now nullable (legacy, not used for matching)
  variationGroupId: string | null // Reference to variation group for matching
  title: string
  body: string // Full post body (markdown)
  imageUrl: string | null
  videoUrl: string | null
  isActive: boolean
  lastUsedAt: string | null
  useCount: number
  status?: PostLibraryStatus // draft, approved, active (has DB default)
  source?: PostLibrarySource // manual, api, import (has DB default)
  approvedAt?: string | null
  createdAt: string
  updatedAt: string
  // Joined data (optional)
  variationGroup?: SkoolVariationGroup | null
}

/**
 * Execution log entry for audit trail (database row)
 */
export interface SkoolPostExecutionLog {
  id: string
  schedulerId: string | null
  postLibraryId: string | null
  oneoffPostId: string | null
  executedAt: string
  status: SchedulerExecutionStatus
  skoolPostId: string | null
  skoolPostUrl: string | null
  errorMessage: string | null
  emailBlastSent: boolean
}

/**
 * Campaign for organizing one-off posts (database row)
 */
export interface SkoolCampaign {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * One-off scheduled post (database row)
 */
export interface SkoolOneOffPost {
  id: string
  groupSlug: string
  category: string
  categoryId: string | null
  scheduledAt: string
  timezone: string
  title: string
  body: string
  imageUrl: string | null
  videoUrl: string | null
  campaignId: string | null
  sendEmailBlast: boolean
  status: OneOffPostStatus
  publishedAt: string | null
  skoolPostId: string | null
  skoolPostUrl: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  // Joined data (optional)
  campaign?: SkoolCampaign | null
}

/**
 * Group settings including email blast tracking (database row)
 */
export interface SkoolGroupSettings {
  groupSlug: string
  lastEmailBlastAt: string | null
  updatedAt: string
}

/**
 * Input for creating a new variation group
 */
export interface SkoolVariationGroupInput {
  name: string
  description?: string | null
  isActive?: boolean
}

/**
 * Input for creating a new scheduled post
 */
export interface SkoolScheduledPostInput {
  groupSlug?: string
  category: string
  categoryId?: string | null
  dayOfWeek: DayOfWeek
  time: string
  variationGroupId?: string | null
  isActive?: boolean
  note?: string | null
}

/**
 * Input for creating a new post library item
 */
export interface SkoolPostLibraryItemInput {
  category?: string
  dayOfWeek?: DayOfWeek | null
  time?: string | null
  variationGroupId?: string | null
  title: string
  body: string
  imageUrl?: string | null
  videoUrl?: string | null
  isActive?: boolean
  status?: PostLibraryStatus
  source?: PostLibrarySource
}

/**
 * Input for creating a new campaign
 */
export interface SkoolCampaignInput {
  name: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  isActive?: boolean
}

/**
 * Input for creating a new one-off post
 */
export interface SkoolOneOffPostInput {
  groupSlug?: string
  category: string
  categoryId?: string | null
  scheduledAt: string
  timezone?: string
  title: string
  body: string
  imageUrl?: string | null
  videoUrl?: string | null
  campaignId?: string | null
  sendEmailBlast?: boolean
  status?: OneOffPostStatus
}

/**
 * Input for logging an execution
 */
export interface SkoolPostExecutionLogInput {
  schedulerId?: string | null
  postLibraryId?: string | null
  oneoffPostId?: string | null
  status: SchedulerExecutionStatus
  skoolPostId?: string | null
  skoolPostUrl?: string | null
  errorMessage?: string | null
  emailBlastSent?: boolean
}

/**
 * Stats returned by get_scheduler_stats function
 */
export interface SchedulerStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  skippedExecutions: number
  lastExecutionAt: string | null
  lastStatus: SchedulerExecutionStatus | null
}

/**
 * Result from get_next_post_for_schedule function
 */
export interface NextPostResult {
  id: string
  title: string
  body: string
  imageUrl: string | null
  videoUrl: string | null
  useCount: number
}

/**
 * Result from get_due_schedules function
 */
export interface DueSchedule {
  id: string
  groupSlug: string
  category: string
  categoryId: string | null
  variationGroupId: string | null
  note: string | null
}

/**
 * Stats for a variation group
 */
export interface VariationGroupStats {
  postCount: number
  schedulerCount: number
}

/**
 * Stats for a campaign
 */
export interface CampaignStats {
  totalPosts: number
  pendingPosts: number
  publishedPosts: number
  failedPosts: number
}

/**
 * Email blast status for a group
 */
export interface EmailBlastStatus {
  available: boolean
  hoursUntilAvailable: number
  lastBlastAt: string | null
}

/**
 * Helper to get day name from day_of_week number
 */
export function getDayName(dayOfWeek: DayOfWeek): DayName {
  return DAY_NAMES[dayOfWeek]
}

/**
 * Helper to format time for display (e.g., "09:00" -> "9:00 AM")
 */
export function formatScheduleTime(time: string): string {
  const parts = time.split(':')
  const hours = Number(parts[0]) || 0
  const minutes = Number(parts[1]) || 0
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}
