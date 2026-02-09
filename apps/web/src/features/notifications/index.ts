/**
 * Notifications Feature
 *
 * Daily KPI snapshot notifications via GHL email/SMS
 */

// Snapshot generation
export {
  generateDailySnapshot,
  type MetricValue,
  type DailySnapshotData,
  type FormattedSnapshot,
} from './lib/generate-snapshot'

// Notification sending
export {
  sendDailySnapshot,
  sendScheduledSnapshots,
  sendTestSnapshot,
  type SendResult,
  type NotificationResult,
} from './lib/send-notification'
