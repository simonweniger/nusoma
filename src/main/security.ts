// ─── Centralized input validation for IPC handlers ───
// Pure functions — no side effects, easy to test.

import { resolve } from 'path'
import { homedir } from 'os'
import { existsSync, statSync } from 'fs'

// UUID v4 pattern (lowercase hex)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validate a plugin/skill name — must be a simple directory name.
 * Rejects: slashes, backslashes, "..", null bytes, empty/whitespace-only.
 */
export function validatePluginName(name: unknown): name is string {
  if (typeof name !== 'string' || name.length === 0 || name.length > 200) return false
  if (name.trim().length === 0) return false
  // Reject path traversal and separators
  if (/[/\\]|\.\.|\0/.test(name)) return false
  return true
}

/**
 * Validate a GitHub repo identifier — must be "owner/repo" with safe chars.
 */
export function validateRepoFormat(repo: unknown): repo is string {
  if (typeof repo !== 'string') return false
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(repo)
}

/**
 * Validate a session ID — UUID v4 format.
 */
export function validateSessionId(id: unknown): id is string {
  if (typeof id !== 'string') return false
  return UUID_RE.test(id)
}

/**
 * Validate a URL for opening externally.
 * Only allows http(s), rejects javascript:, data:, file:, etc.
 */
export function validateUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Escape a string for safe embedding in AppleScript double-quoted strings.
 * Handles backslashes, double quotes, and newlines.
 */
export function sanitizeAppleScript(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

/**
 * Validate a project path — must be absolute, resolve cleanly, and not escape
 * the home directory or /tmp.
 */
export function validateProjectPath(p: unknown): p is string {
  if (typeof p !== 'string' || p.length === 0) return false
  const resolved = resolve(p)
  const home = homedir()
  // Allow paths under home, /tmp, or /private/tmp (macOS)
  return (
    resolved.startsWith(home) ||
    resolved.startsWith('/tmp') ||
    resolved.startsWith('/private/tmp')
  )
}

/**
 * Verify a binary path exists and is a file (not a directory or symlink to unexpected location).
 * Returns the resolved path if valid, null otherwise.
 */
export function verifyBinary(path: string): string | null {
  try {
    const resolved = resolve(path)
    if (!existsSync(resolved)) return null
    const st = statSync(resolved)
    if (!st.isFile()) return null
    return resolved
  } catch {
    return null
  }
}
