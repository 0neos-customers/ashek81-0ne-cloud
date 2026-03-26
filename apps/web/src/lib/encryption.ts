/**
 * Shared AES-256-CBC encryption utilities.
 *
 * Used by cookie-encryption.ts and plaid-encryption.ts — each passes its
 * own env-var-derived key so the underlying crypto is identical and
 * maintained in one place.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Encrypt a string using AES-256-CBC.
 * Returns format: IV:encryptedData (both in hex).
 */
export function encrypt(text: string, key: Buffer): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt a string that was encrypted with encrypt().
 * Input format: IV:encryptedData (both in hex).
 */
export function decrypt(encryptedText: string, key: Buffer): string {
  const parts = encryptedText.split(':')
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted format - expected IV:data')
  }

  const [ivHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Resolve a 32-byte key from a hex-encoded environment variable.
 */
export function resolveKey(envVar: string): Buffer {
  const keyHex = process.env[envVar]

  if (!keyHex) {
    throw new Error(`${envVar} environment variable not set`)
  }

  if (keyHex.length !== 64) {
    throw new Error(`${envVar} must be 64 hex characters (32 bytes)`)
  }

  return Buffer.from(keyHex, 'hex')
}

/**
 * Generate a new encryption key (for setup).
 * Returns a 64-character hex string.
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex')
}
