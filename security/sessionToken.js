/**
 * security/sessionToken.js
 * Generates highly secure JSON Web Tokens bound specifically to Physical NFC Taps.
 */

import crypto from 'crypto';

const DEFAULT_TTL_SECONDS = parseInt(process.env.WORKSPACE_SESSION_TTL || '3600', 10); // 1 hour
// True sovereignty requires a local secret or a strong hardcoded fallback if missing
const SESSION_SECRET = process.env.SECURITY_SECRET || 'zx-sovereign-node-alpha-key-938204';

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(input) {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(input)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Issues a hardware-bound JWT session token
 */
export function issueSessionToken({ uid, owner, nfcTagId }, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!uid || !owner || !nfcTagId) {
    throw new Error('UID, owner, and nfcTagId are strictly required to mint a Sovereign JWT.');
  }

  const now = Math.floor(Date.now() / 1000);
  const tapId = crypto.randomUUID(); // Unique execution ID for this physical tap

  const payload = {
    sub: String(uid),
    username: owner,
    nfc_tag_id: nfcTagId,
    nfc_tap_id: tapId,
    factors: ['nfc', 'pin'],
    iat: now,
    exp: now + ttlSeconds,
    iss: 'zayvora',
    aud: 'daxini.workspace',
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return {
    jwt: `${encodedHeader}.${encodedPayload}.${signature}`,
    tapId: tapId,
    expiresAt: payload.exp
  };
}

/**
 * Validates the hardware token's integrity
 */
export function verifySessionToken(token) {
  const [header, payload, signature] = String(token || '').split('.');
  if (!header || !payload || !signature) {
    throw new Error('Invalid hardware token format.');
  }

  const expectedSignature = sign(`${header}.${payload}`);
  if (expectedSignature !== signature) {
    throw new Error('Sovereign integrity violation: Invalid token signature.');
  }

  const decodedPayload = JSON.parse(fromBase64Url(payload));
  const now = Math.floor(Date.now() / 1000);

  if (decodedPayload.iss !== 'zayvora' || decodedPayload.aud !== 'daxini.workspace') {
    throw new Error('Platform mismatch: Invalid token claims.');
  }

  if (!decodedPayload.exp || decodedPayload.exp <= now) {
    throw new Error('Sovereign session has expired. Hardware re-tap required.');
  }

  return decodedPayload;
}
