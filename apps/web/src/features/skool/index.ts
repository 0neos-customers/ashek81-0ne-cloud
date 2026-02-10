/**
 * Skool Integration Feature
 *
 * Exports for Skool sync, DM management, hand-raiser automation,
 * and automated post scheduling.
 */

// Types (excluding SkoolCategory to avoid conflict with hooks)
export type {
  SkoolSurveyAnswer,
  SkoolApiMember,
  SkoolApiChatChannel,
  SkoolApiMessage,
  SkoolApiGroup,
  SkoolMemberRow,
  SkoolConversationRow,
  SkoolMessageRow,
  SkoolHandRaiserCampaignRow,
  SkoolHandRaiserSentRow,
  MemberSyncResult,
  DMSyncResult,
  MemberMatchResult,
  SkoolMemberDisplay,
  SkoolConversationDisplay,
  SkoolMessageDisplay,
  CreatePostParams,
  CreatePostResult,
  UploadResult,
  UploadError,
} from './types'
// Export SkoolCategory from types with alias to avoid conflict
export type { SkoolCategory as SkoolApiCategory } from './types'

// Lib
export * from './lib/config'
export * from './lib/skool-client'
export * from './lib/member-sync'
export * from './lib/metrics-sync'
// Export post-client functions (excluding createPost which conflicts with hooks)
export {
  uploadFileFromUrl,
  getCategories,
  discoverEndpoints,
} from './lib/post-client'
// Export createPost from post-client with alias
export { createPost as createSkoolPost } from './lib/post-client'

// Hooks (Post Scheduler)
export * from './hooks'

// Components (Post Scheduler)
export * from './components'
