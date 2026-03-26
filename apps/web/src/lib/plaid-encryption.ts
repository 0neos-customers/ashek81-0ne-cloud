/**
 * Plaid Access Token Encryption
 *
 * Uses shared AES-256-CBC encryption with PLAID_ENCRYPTION_KEY.
 */

import { encrypt, decrypt, resolveKey } from './encryption'

export function encryptAccessToken(plaintext: string): string {
  return encrypt(plaintext, resolveKey('PLAID_ENCRYPTION_KEY'))
}

export function decryptAccessToken(encrypted: string): string {
  return decrypt(encrypted, resolveKey('PLAID_ENCRYPTION_KEY'))
}
