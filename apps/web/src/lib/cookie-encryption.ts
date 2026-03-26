/**
 * Cookie Encryption Utilities
 * Phase 6: Secure storage of Skool cookies
 *
 * Uses shared AES-256-CBC encryption with COOKIE_ENCRYPTION_KEY.
 */

import { encrypt, decrypt, resolveKey, generateEncryptionKey } from './encryption'

// ============================================
// Encryption Functions
// ============================================

/**
 * Encrypt a string using AES-256-CBC
 * Returns format: IV:encryptedData (both in hex)
 */
export function encryptCookies(plaintext: string): string {
  return encrypt(plaintext, resolveKey('COOKIE_ENCRYPTION_KEY'))
}

/**
 * Decrypt a string that was encrypted with encryptCookies
 * Input format: IV:encryptedData (both in hex)
 */
export function decryptCookies(encrypted: string): string {
  return decrypt(encrypted, resolveKey('COOKIE_ENCRYPTION_KEY'))
}

// ============================================
// Helper Functions
// ============================================

export { generateEncryptionKey }

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  const keyHex = process.env.COOKIE_ENCRYPTION_KEY
  return !!(keyHex && keyHex.length === 64)
}

/**
 * Parse JWT expiry from auth_token
 * JWT format: header.payload.signature
 */
export function parseJwtExpiry(token: string): Date | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode payload (base64url -> JSON)
    const payloadB64 = parts[1]
    // Handle base64url encoding
    const payloadB64Std = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const payloadJson = Buffer.from(payloadB64Std, 'base64').toString('utf8')
    const payload = JSON.parse(payloadJson)

    if (payload.exp && typeof payload.exp === 'number') {
      return new Date(payload.exp * 1000)
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if a cookie string contains an auth_token and extract its expiry
 */
export function extractAuthTokenExpiry(cookies: string): Date | null {
  // Parse cookie string to find auth_token
  const cookiePairs = cookies.split(';').map((pair) => pair.trim())

  for (const pair of cookiePairs) {
    const [name, value] = pair.split('=')
    if (name?.trim() === 'auth_token' && value) {
      return parseJwtExpiry(value.trim())
    }
  }

  return null
}

/**
 * Check if cookies have session cookie present
 */
export function hasSessionCookie(cookies: string): boolean {
  const cookiePairs = cookies.split(';').map((pair) => pair.trim())

  for (const pair of cookiePairs) {
    const [name] = pair.split('=')
    if (name?.trim() === 'session') {
      return true
    }
  }

  return false
}
