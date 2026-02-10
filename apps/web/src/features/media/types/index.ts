/**
 * GHL Media Library Types
 *
 * Type definitions for GoHighLevel Media Library API responses
 * and upload management.
 */

// =============================================================================
// API TYPES (from GHL Media Library API)
// =============================================================================

/**
 * File or folder from GHL Media Library
 */
export interface GHLMediaFile {
  id: string
  name: string
  url: string
  type: 'file' | 'folder'
  parentId: string | null
  mimeType?: string
  size?: number
  altId?: string
  createdAt?: string
}

/**
 * Response from media list API
 */
export interface MediaListResponse {
  files: GHLMediaFile[]
}

// =============================================================================
// UPLOAD TYPES
// =============================================================================

/**
 * Upload progress tracking for individual files
 */
export interface UploadProgress {
  id: string
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  url?: string
}

// =============================================================================
// NAVIGATION TYPES
// =============================================================================

/**
 * Breadcrumb item for folder navigation
 */
export interface BreadcrumbItem {
  id: string
  name: string
}
