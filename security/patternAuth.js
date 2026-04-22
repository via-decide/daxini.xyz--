'use strict';

/**
 * patternAuth.js — Layer 2: Pattern Authentication Engine
 * 
 * Zayvora's core auth advantage. Pattern (PIN/password) is NEVER stored raw.
 * Uses salted SHA-256 + HMAC with:
 *   - Attempt counter per identity
 *   - Cooldown after 5 failed attempts (60s)
 *   - Temporary lock after 10 failed attempts (15min)
 *   - Brute-force resistance via timing-safe comparison
 */

import crypto from 'crypto';

// ── In-Memory Attempt Tracking ─────────────────────────────
const attemptStore = new Map();

const AUTH_CONFIG = {
  COOLDOWN_THRESHOLD: 5,
  LOCKOUT_THRESHOLD: 10,
  COOLDOWN_DURATION_MS: 60 * 1000,        // 60 seconds
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,    // 15 minutes
  SALT_BYTES: 32,
  HASH_ITERATIONS: 100000,
  KEY_LENGTH: 64,
  DIGEST: 'sha512',
};

/**
 * Hash a pattern (PIN/password) with a unique salt.
 * Returns `pbkdf2$<salt>$<iterations>$<hash>` — NEVER the raw pattern.
 */
export function hashPattern(rawPattern) {
  if (!rawPattern || typeof rawPattern !== 'string') {
    throw new Error('Pattern must be a non-empty string.');
  }

  const salt = crypto.randomBytes(AUTH_CONFIG.SALT_BYTES).toString('hex');
  const hash = crypto.pbkdf2Sync(
    rawPattern,
    salt,
    AUTH_CONFIG.HASH_ITERATIONS,
    AUTH_CONFIG.KEY_LENGTH,
    AUTH_CONFIG.DIGEST
  ).toString('hex');

  return `pbkdf2$${salt}$${AUTH_CONFIG.HASH_ITERATIONS}$${hash}`;
}

/**
 * Verify a pattern against a stored hash using timing-safe comparison.
 */
export function verifyPattern(rawPattern, storedHash) {
  if (!rawPattern || !storedHash) return false;

  const parts = String(storedHash).split('$');
  if (parts[0] !== 'pbkdf2' || parts.length !== 4) return false;

  const [, salt, iterations, expectedHash] = parts;
  const computedHash = crypto.pbkdf2Sync(
    rawPattern,
    salt,
    parseInt(iterations, 10),
    AUTH_CONFIG.KEY_LENGTH,
    AUTH_CONFIG.DIGEST
  ).toString('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Get the attempt state for an identity (IP or fingerprint).
 */
function getAttemptState(identityKey) {
  if (!attemptStore.has(identityKey)) {
    attemptStore.set(identityKey, {
      failedAttempts: 0,
      lastFailedAt: 0,
      lockedUntil: 0,
      cooldownUntil: 0,
    });
  }
  return attemptStore.get(identityKey);
}

/**
 * Check if an identity is currently locked or in cooldown.
 * Returns: { allowed: boolean, reason: string, retryAfterMs: number }
 */
export function checkAttemptStatus(identityKey) {
  const state = getAttemptState(identityKey);
  const now = Date.now();

  // Check hard lockout (10+ failures)
  if (state.lockedUntil > now) {
    return {
      allowed: false,
      reason: 'temporary_lock',
      retryAfterMs: state.lockedUntil - now,
      failedAttempts: state.failedAttempts,
    };
  }

  // Check cooldown (5+ failures)
  if (state.cooldownUntil > now) {
    return {
      allowed: false,
      reason: 'cooldown',
      retryAfterMs: state.cooldownUntil - now,
      failedAttempts: state.failedAttempts,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    retryAfterMs: 0,
    failedAttempts: state.failedAttempts,
  };
}

/**
 * Record a failed authentication attempt.
 */
export function recordFailedAttempt(identityKey) {
  const state = getAttemptState(identityKey);
  const now = Date.now();

  state.failedAttempts += 1;
  state.lastFailedAt = now;

  if (state.failedAttempts >= AUTH_CONFIG.LOCKOUT_THRESHOLD) {
    state.lockedUntil = now + AUTH_CONFIG.LOCKOUT_DURATION_MS;
    console.warn(`[SECURITY] Identity ${identityKey.substring(0, 8)}... LOCKED for 15 minutes (${state.failedAttempts} failures)`);
  } else if (state.failedAttempts >= AUTH_CONFIG.COOLDOWN_THRESHOLD) {
    state.cooldownUntil = now + AUTH_CONFIG.COOLDOWN_DURATION_MS;
    console.warn(`[SECURITY] Identity ${identityKey.substring(0, 8)}... in COOLDOWN for 60s (${state.failedAttempts} failures)`);
  }

  return state.failedAttempts;
}

/**
 * Record a successful authentication (resets counter).
 */
export function recordSuccessfulAttempt(identityKey) {
  attemptStore.set(identityKey, {
    failedAttempts: 0,
    lastFailedAt: 0,
    lockedUntil: 0,
    cooldownUntil: 0,
  });
}

/**
 * Periodic cleanup of stale attempt records (call every ~30 minutes).
 */
export function cleanupAttemptStore() {
  const now = Date.now();
  const staleThreshold = 60 * 60 * 1000; // 1 hour

  for (const [key, state] of attemptStore) {
    if (
      state.failedAttempts === 0 ||
      (now - state.lastFailedAt > staleThreshold && state.lockedUntil < now)
    ) {
      attemptStore.delete(key);
    }
  }
}

// Auto-cleanup every 30 minutes
setInterval(cleanupAttemptStore, 30 * 60 * 1000);
