/**
 * Content sanitization and validation utilities.
 * All user-submitted content passes through these functions before storage.
 */

/**
 * Sanitize text content for safe storage and display.
 * - Strips HTML tags
 * - Normalizes whitespace
 * - Removes null bytes
 * - Trims leading/trailing whitespace
 */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/\0/g, '')                    // remove null bytes
    .replace(/<[^>]*>/g, '')               // strip HTML tags
    .replace(/&lt;/gi, '<')               // decode common HTML entities (for display as plain text)
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')              // collapse horizontal whitespace
    .replace(/[ \t]+\n/g, '\n')           // trim trailing spaces before newlines
    .replace(/\n[ \t]+/g, '\n')           // trim leading spaces after newlines
    .replace(/\n{3,}/g, '\n\n')           // collapse excessive newlines
    .trim();
}

/**
 * Check whether a text string has meaningful visible content
 * (not just whitespace, zero-width characters, etc.).
 */
export function hasVisibleContent(text: string): boolean {
  // Remove zero-width chars and check length
  const stripped = text
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/\s/g, '');
  return stripped.length > 0;
}

/**
 * Truncate text to a maximum length.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

/**
 * Generate a URL-safe public ID for posts and replies.
 * Uses nanoid-style characters: lowercase alphanumeric + hyphen.
 */
import crypto from 'crypto';

export function generatePublicId(): string {
  // 12 random bytes → 16-char base64url string
  return crypto.randomBytes(12).toString('base64url');
}

/**
 * Escape text for safe display in HTML contexts.
 * Used when rendering in non-JSX contexts.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
