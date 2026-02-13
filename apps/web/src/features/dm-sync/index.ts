/**
 * DM Sync Feature
 *
 * Bidirectional sync between Skool DMs and GHL conversations.
 * Includes contact mapping, message deduplication, and hand-raiser automation.
 *
 * @module dm-sync
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Skool types
  SkoolUser,
  SkoolConversation,
  SkoolMessage,
  // Database row types
  DmSyncConfigRow,
  ContactMappingRow,
  DmMessageRow,
  HandRaiserCampaignRow,
  HandRaiserSentRow,
  // Domain types
  DmSyncConfig,
  ContactMapping,
  DmMessage,
  HandRaiserCampaign,
  HandRaiserSent,
  // Result types
  SyncResult,
  SyncError,
  SendResult,
  MapContactResult,
  // Input types
  CreateSyncConfigInput,
  CreateHandRaiserCampaignInput,
  SendDmInput,
  // GHL types
  GhlContact,
  GhlConversation,
  GhlMessage,
} from './types'

// =============================================================================
// SKOOL DM CLIENT
// =============================================================================

export {
  SkoolDmClient,
  createSkoolDmClient,
  type SkoolDmClientConfig,
} from './lib/skool-dm-client'

// =============================================================================
// CONTACT MAPPER
// =============================================================================

export {
  ContactMapper,
  createContactMapper,
  generateSyntheticEmail,
  isSyntheticEmail,
  normalizeName,
  calculateNameSimilarity,
  // New exports for Phase 3
  findOrCreateGhlContact,
  findGhlContactsForUsers,
  extractMemberEmail,
  extractMemberPhone,
  type ContactMapperConfig,
  type MatchMethod,
  type ContactLookupResult,
} from './lib/contact-mapper'

// =============================================================================
// GHL CONVERSATION CLIENT
// =============================================================================

export {
  // Legacy client (non-marketplace)
  GhlConversationClient,
  createGhlConversationClient,
  createGhlConversationClientFromEnv,
  type GhlConversationClientConfig,
  // Marketplace client (Phase 4)
  GhlConversationProviderClient,
  createGhlConversationProviderClient,
  createGhlConversationProviderClientFromEnv,
  type GhlMarketplaceConfig,
  // Webhook utilities
  verifyGhlWebhookSignature,
  type GhlOutboundMessagePayload,
} from './lib/ghl-conversation'

// =============================================================================
// SYNC ENGINE
// =============================================================================

export {
  DmSyncEngine,
  createSyncEngine,
  createSyncEngineFromConfig,
  needsSync,
  calculateSyncPriority,
  sortBySyncPriority,
  type SyncEngineConfig,
  type SyncOptions,
} from './lib/sync-engine'
