/**
 * DM Sync Feature Types
 *
 * Type definitions for Skool → GHL DM synchronization,
 * contact mapping, and hand-raiser campaigns.
 */

// =============================================================================
// SKOOL DM TYPES (from Skool API)
// =============================================================================

/**
 * Skool user profile data
 */
export interface SkoolUser {
  id: string
  username: string
  displayName: string
  profileImage: string | null
  email?: string
}

/**
 * Skool conversation (DM thread)
 */
export interface SkoolConversation {
  id: string
  channelId: string
  participant: SkoolUser
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  unreadCount: number
}

/**
 * Skool message within a conversation
 */
export interface SkoolMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  sentAt: Date
  isOutbound: boolean
}

// =============================================================================
// DATABASE ROW TYPES (match 027-dm-sync.sql + 035-rename-user-id-columns.sql)
// =============================================================================

/**
 * Database row for dm_sync_config table
 */
export interface DmSyncConfigRow {
  id: string
  clerkUserId: string
  skoolCommunitySlug: string
  ghlLocationId: string
  skoolCommunityId: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Database row for contact_channels table (per-staff channel cache)
 */
export interface ContactChannelRow {
  id: string
  clerkUserId: string
  skoolUserId: string
  staffSkoolId: string
  skoolChannelId: string
  resolvedAt: string
  createdAt: string
  updatedAt: string
}

/**
 * Database row for dm_contact_mappings table
 */
export interface ContactMappingRow {
  id: string
  clerkUserId: string
  skoolUserId: string
  skoolUsername: string | null
  skoolDisplayName: string | null
  ghlContactId: string | null
  matchMethod: 'skool_id' | 'email' | 'name' | 'synthetic' | 'manual' | 'no_email' | null
  email: string | null
  phone: string | null
  contactType: 'community_member' | 'dm_contact' | 'unknown' | null
  createdAt: string
  updatedAt: string | null
}

/**
 * Database row for dm_messages table
 */
export interface DmMessageRow {
  id: string
  clerkUserId: string
  skoolConversationId: string
  skoolMessageId: string
  ghlMessageId: string | null
  skoolUserId: string
  direction: 'inbound' | 'outbound'
  messageText: string | null
  status: 'synced' | 'pending' | 'failed'
  createdAt: string
  syncedAt: string | null
  senderName?: string | null
  // Phase 5: Multi-staff support
  staffSkoolId?: string | null
  staffDisplayName?: string | null
  ghlUserId?: string | null
  // Hand-raiser extension routing
  source?: 'ghl' | 'hand-raiser' | 'manual'
}

/**
 * Database row for staff_users table
 */
export interface StaffUserRow {
  id: string
  clerkUserId: string
  skoolUserId: string
  skoolUsername: string | null
  displayName: string
  ghlUserId: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Database row for dm_hand_raiser_campaigns table
 */
export interface HandRaiserCampaignRow {
  id: string
  clerkUserId: string
  postUrl: string
  skoolPostId: string | null
  keywordFilter: string | null
  dmTemplate: string | null  // Now optional - if null, only tags GHL (no DM sent)
  ghlTag: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Database row for dm_hand_raiser_sent table
 */
export interface HandRaiserSentRow {
  id: string
  campaignId: string
  skoolUserId: string
  sentAt: string
}

// =============================================================================
// DOMAIN TYPES (for business logic)
// =============================================================================

/**
 * DM sync configuration
 */
export interface DmSyncConfig {
  id: string
  userId: string
  skoolCommunitySlug: string
  ghlLocationId: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Contact mapping between Skool and GHL
 */
export interface ContactMapping {
  id: string
  userId: string
  skoolUserId: string
  skoolUsername: string | null
  skoolDisplayName: string | null
  ghlContactId: string | null
  matchMethod: 'skool_id' | 'email' | 'name' | 'synthetic' | 'manual' | 'no_email' | null
  email: string | null
  phone: string | null
  contactType: 'community_member' | 'dm_contact' | 'unknown' | null
  createdAt: Date
  updatedAt: Date | null
}

/**
 * Staff user for multi-staff DM attribution
 */
export interface StaffUser {
  id: string
  userId: string
  skoolUserId: string
  skoolUsername: string | null
  displayName: string
  ghlUserId: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Synced DM message
 */
export interface DmMessage {
  id: string
  userId: string
  skoolConversationId: string
  skoolMessageId: string
  ghlMessageId: string | null
  skoolUserId: string
  direction: 'inbound' | 'outbound'
  messageText: string | null
  status: 'synced' | 'pending' | 'failed'
  createdAt: Date
  syncedAt: Date | null
}

/**
 * Hand-raiser campaign configuration
 */
export interface HandRaiserCampaign {
  id: string
  userId: string
  postUrl: string
  skoolPostId: string | null
  keywordFilter: string | null
  dmTemplate: string
  ghlTag: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Record of sent hand-raiser DM
 */
export interface HandRaiserSent {
  id: string
  campaignId: string
  skoolUserId: string
  sentAt: Date
}

// =============================================================================
// OPERATION RESULT TYPES
// =============================================================================

/**
 * Result from sync operations
 */
export interface SyncResult {
  success: boolean
  stats: {
    total: number
    synced: number
    skipped: number
    failed: number
  }
  errors: SyncError[]
  duration: number // milliseconds
}

/**
 * Individual sync error
 */
export interface SyncError {
  messageId?: string
  conversationId?: string
  error: string
  code?: string
}

/**
 * Result from sending a DM
 */
export interface SendResult {
  success: boolean
  skoolMessageId?: string
  ghlMessageId?: string
  error?: string
}

/**
 * Result from contact mapping operation
 */
export interface MapContactResult {
  success: boolean
  mapping?: ContactMapping
  matchMethod?: 'skool_id' | 'email' | 'name' | 'synthetic' | 'manual'
  error?: string
}

// =============================================================================
// INPUT TYPES (for function parameters)
// =============================================================================

/**
 * Input for creating a sync config
 */
export interface CreateSyncConfigInput {
  userId: string
  skoolCommunitySlug: string
  ghlLocationId: string
  enabled?: boolean
}

/**
 * Input for creating a hand-raiser campaign
 */
export interface CreateHandRaiserCampaignInput {
  userId: string
  postUrl: string
  dmTemplate: string
  keywordFilter?: string
  ghlTag?: string
}

/**
 * Input for sending a DM through sync
 */
export interface SendDmInput {
  userId: string
  skoolUserId: string
  message: string
  conversationId?: string
}

// =============================================================================
// GHL TYPES (for GHL Conversations API)
// =============================================================================

/**
 * GHL contact for conversation creation
 */
export interface GhlContact {
  id: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  name?: string
}

/**
 * GHL conversation
 */
export interface GhlConversation {
  id: string
  contactId: string
  locationId: string
  type: string
}

/**
 * GHL message
 */
export interface GhlMessage {
  id: string
  conversationId: string
  body: string
  direction: 'inbound' | 'outbound'
  dateAdded: string
}

// =============================================================================
// HAND-RAISER TYPES (Phase 7)
// =============================================================================

/**
 * Comment on a Skool post
 */
export interface SkoolComment {
  id: string
  userId: string
  username: string
  displayName: string
  content: string
  createdAt: string
}

/**
 * Result from hand-raiser processing
 */
export interface HandRaiserResult {
  campaignsProcessed: number
  commentsChecked: number
  dmsSent: number
  errors: number
  errorDetails: Array<{ campaignId?: string; error: string }>
}

// =============================================================================
// INBOX CONVERSATION TYPES (for Skool Inbox UI)
// =============================================================================

/**
 * Participant info for a conversation
 */
export interface InboxConversationParticipant {
  skoolUserId: string
  displayName: string | null
  username: string | null
  ghlContactId?: string | null
}

/**
 * Last message preview for a conversation
 */
export interface InboxConversationLastMessage {
  text: string | null
  direction: 'inbound' | 'outbound'
  createdAt: string
}

/**
 * Conversation summary for list view
 */
export interface InboxConversation {
  conversationId: string
  participant: InboxConversationParticipant
  lastMessage: InboxConversationLastMessage
  messageCount: number
  pendingCount: number
  syncedCount: number
}

/**
 * Summary statistics for all conversations
 */
export interface InboxConversationsSummary {
  totalConversations: number
  totalPending: number
}

/**
 * Message in a conversation thread
 */
export interface InboxMessage {
  id: string
  direction: 'inbound' | 'outbound'
  messageText: string | null
  senderName: string | null
  status: 'synced' | 'pending' | 'failed'
  createdAt: string
}

/**
 * Full conversation detail
 */
export interface InboxConversationDetail {
  id: string
  participant: InboxConversationParticipant
  messageCount: number
}
