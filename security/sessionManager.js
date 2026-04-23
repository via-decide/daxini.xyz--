'use strict';

/**
 * sessionManager.js — Layer 2: Short-Lived Session System
 * 
 * Enforces:
 *   - Short-lived tokens (15-30 min configurable)
 *   - Session stored in memory on server side (NOT localStorage for sensitive data)
 *   - Automatic expiry and cleanup
 *   - One active session per identity (revokes previous)
 *   - Session fingerprint binding (prevents session hijacking)
 */

import crypto from 'crypto';

const SESSION_CONFIG = {
  TTL_MS: 20 * 60 * 1000,            // 20 minutes default
  MAX_SESSIONS: 1000,                 // Max concurrent sessions
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // Cleanup every 5 minutes
  TOKEN_BYTES: 32,
};

// ── In-Memory Session Store ─────────────────────────────────
const sessions = new Map();
const identityToSession = new Map(); // identity -> sessionId (one-to-one)

/**
 * Create a new session bound to an identity and client fingerprint.
 * Automatically revokes any previous session for this identity.
 */
export function createSession(identity, fingerprint, metadata = {}) {
  if (!identity || !fingerprint) {
    throw new Error('Identity and fingerprint are required to create a session.');
  }

  // Revoke previous session for this identity
  const existingSessionId = identityToSession.get(identity);
  if (existingSessionId) {
    sessions.delete(existingSessionId);
  }

  // Enforce max sessions
  if (sessions.size >= SESSION_CONFIG.MAX_SESSIONS) {
    evictOldestSession();
  }

  const sessionId = crypto.randomBytes(SESSION_CONFIG.TOKEN_BYTES).toString('hex');
  const now = Date.now();

  const session = {
    id: sessionId,
    identity,
    fingerprint,
    createdAt: now,
    expiresAt: now + SESSION_CONFIG.TTL_MS,
    lastActivity: now,
    metadata,
  };

  sessions.set(sessionId, session);
  identityToSession.set(identity, sessionId);

  return {
    sessionId,
    expiresAt: session.expiresAt,
    ttlMs: SESSION_CONFIG.TTL_MS,
  };
}

/**
 * Validate a session token.
 * Checks expiry AND fingerprint binding to prevent hijacking.
 */
export function validateSession(sessionId, fingerprint) {
  if (!sessionId || !fingerprint) {
    return { valid: false, reason: 'missing_credentials' };
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return { valid: false, reason: 'session_not_found' };
  }

  const now = Date.now();

  // Check expiry
  if (now > session.expiresAt) {
    sessions.delete(sessionId);
    identityToSession.delete(session.identity);
    return { valid: false, reason: 'session_expired' };
  }

  // Check fingerprint binding (anti-hijack)
  if (session.fingerprint !== fingerprint) {
    console.warn(`[SECURITY] Session hijack attempt detected. Session: ${sessionId.substring(0, 8)}...`);
    sessions.delete(sessionId);
    identityToSession.delete(session.identity);
    return { valid: false, reason: 'fingerprint_mismatch' };
  }

  // Update last activity
  session.lastActivity = now;

  return {
    valid: true,
    identity: session.identity,
    expiresAt: session.expiresAt,
    remainingMs: session.expiresAt - now,
  };
}

/**
 * Revoke a session explicitly (logout).
 */
export function revokeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    identityToSession.delete(session.identity);
    sessions.delete(sessionId);
    return true;
  }
  return false;
}

/**
 * Get session info for UI feedback (remaining time, etc.)
 */
export function getSessionInfo(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {return null;}

  const now = Date.now();
  if (now > session.expiresAt) {
    sessions.delete(sessionId);
    identityToSession.delete(session.identity);
    return null;
  }

  return {
    identity: session.identity,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    remainingMs: session.expiresAt - now,
    isExpiringSoon: (session.expiresAt - now) < 5 * 60 * 1000, // < 5 min
  };
}

/**
 * Evict oldest session when at capacity.
 */
function evictOldestSession() {
  let oldest = null;
  let oldestTime = Infinity;

  for (const [id, session] of sessions) {
    if (session.createdAt < oldestTime) {
      oldestTime = session.createdAt;
      oldest = id;
    }
  }

  if (oldest) {
    const session = sessions.get(oldest);
    if (session) {identityToSession.delete(session.identity);}
    sessions.delete(oldest);
  }
}

/**
 * Periodic cleanup of expired sessions.
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      identityToSession.delete(session.identity);
      sessions.delete(id);
    }
  }
}

// Auto-cleanup
setInterval(cleanupExpiredSessions, SESSION_CONFIG.CLEANUP_INTERVAL_MS);

export function getActiveSessionCount() {
  return sessions.size;
}
