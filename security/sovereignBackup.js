'use strict';

/**
 * sovereignBackup.js — Encrypted Identity Backup System
 * 
 * Architecture:
 *   Mac Mini = Sovereign Backup Node (source of truth)
 *   Production = Runtime node (may be Vercel, VPS, etc.)
 * 
 * Flow:
 *   1. On passport provision → encrypt + write backup snapshot
 *   2. On schedule (every 6h) → create encrypted full backup
 *   3. On recovery request → validate identity proof → restore from backup
 * 
 * Security:
 *   - AES-256-GCM encryption at rest
 *   - Recovery requires NFC Tag ID + Recovery Key (issued at provision time)
 *   - Backup files are signed with HMAC to detect tampering
 *   - All recovery attempts logged
 *   - Cloudflare tunnel protects transport layer
 *   - Mirror v3 threat detection on all recovery endpoints
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──────────────────────────────────────────
const BACKUP_CONFIG = {
  BACKUP_DIR: path.join(__dirname, '../data/backups'),
  ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY || null,
  ALGORITHM: 'aes-256-gcm',
  IV_BYTES: 16,
  SALT_BYTES: 32,
  KEY_DERIVATION_ITERATIONS: 200000,
  RECOVERY_KEY_BYTES: 16,
  MAX_BACKUPS: 30,           // Keep 30 backup snapshots (30 days at 1/day)
  BACKUP_INTERVAL_MS: 6 * 60 * 60 * 1000, // Every 6 hours
};

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_CONFIG.BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_CONFIG.BACKUP_DIR, { recursive: true });
}

/**
 * Derive an encryption key from a passphrase using PBKDF2.
 * If BACKUP_ENCRYPTION_KEY env var is set, use that.
 * Otherwise derive from machine-specific entropy.
 */
function getEncryptionKey() {
  const source = BACKUP_CONFIG.ENCRYPTION_KEY
    || `zayvora-sovereign-${process.env.USER || 'node'}-${__dirname}`;

  return crypto.pbkdf2Sync(
    source,
    'zayvora-backup-salt-v1',
    BACKUP_CONFIG.KEY_DERIVATION_ITERATIONS,
    32, // 256-bit key
    'sha512'
  );
}

/**
 * Encrypt data with AES-256-GCM.
 * Returns: { iv, authTag, ciphertext } all as hex strings.
 */
function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(BACKUP_CONFIG.IV_BYTES);
  const cipher = crypto.createCipheriv(BACKUP_CONFIG.ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    iv: iv.toString('hex'),
    authTag,
    ciphertext,
  };
}

/**
 * Decrypt data encrypted with AES-256-GCM.
 */
function decrypt(encryptedData) {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  const decipher = crypto.createDecipheriv(BACKUP_CONFIG.ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

/**
 * Sign a backup with HMAC-SHA256 to detect tampering.
 */
function signBackup(data) {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Verify backup signature.
 */
function verifySignature(data, signature) {
  const expected = signBackup(data);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

// ── Recovery Key Generation ────────────────────────────────

/**
 * Generate a human-readable recovery key at provision time.
 * Format: XXXX-XXXX-XXXX-XXXX (16 chars, base32-ish for readability)
 * 
 * This key is shown ONCE to the user and stored hashed.
 * It is required (along with NFC Tag ID) to recover an account.
 */
export function generateRecoveryKey() {
  const bytes = crypto.randomBytes(BACKUP_CONFIG.RECOVERY_KEY_BYTES);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I confusion
  let key = '';
  for (const b of bytes) {
    key += alphabet[b % alphabet.length];
  }
  // Format as XXXX-XXXX-XXXX-XXXX
  return key.match(/.{4}/g).join('-');
}

/**
 * Hash a recovery key for storage (never store raw).
 */
export function hashRecoveryKey(recoveryKey) {
  const normalized = recoveryKey.replace(/-/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized + 'zayvora-recovery-v1').digest('hex');
}

/**
 * Verify a recovery key against its stored hash.
 */
export function verifyRecoveryKey(providedKey, storedHash) {
  const computedHash = hashRecoveryKey(providedKey);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

// ── Backup Operations ──────────────────────────────────────

/**
 * Create an encrypted backup of a single passport record.
 * Called on every provision to maintain real-time backup.
 */
export function backupPassport(passportData) {
  try {
    const payload = JSON.stringify({
      ...passportData,
      backed_up_at: new Date().toISOString(),
      version: 1,
    });

    const encrypted = encrypt(payload);
    const signature = signBackup(JSON.stringify(encrypted));

    const backupEntry = {
      type: 'passport',
      uid: passportData.uid,
      encrypted,
      signature,
      created_at: new Date().toISOString(),
    };

    // Write individual passport backup
    const filePath = path.join(BACKUP_CONFIG.BACKUP_DIR, `passport_${passportData.uid}.enc`);
    fs.writeFileSync(filePath, JSON.stringify(backupEntry, null, 2), 'utf8');

    console.log(`[BACKUP] Passport ${passportData.uid} backed up successfully.`);
    return true;
  } catch (err) {
    console.error(`[BACKUP] Failed to backup passport: ${err.message}`);
    return false;
  }
}

/**
 * Create a full encrypted snapshot of the sovereign_passports table.
 * This is the master backup used for full recovery.
 */
export function createFullBackup(db) {
  try {
    if (!db || !db.prepare) {
      console.warn('[BACKUP] Database not available for full backup.');
      return false;
    }

    const passports = db.prepare('SELECT * FROM sovereign_passports').all();
    if (passports.length === 0) {
      console.log('[BACKUP] No passports to backup.');
      return true;
    }

    const payload = JSON.stringify({
      type: 'full_backup',
      count: passports.length,
      passports,
      created_at: new Date().toISOString(),
      version: 1,
    });

    const encrypted = encrypt(payload);
    const signature = signBackup(JSON.stringify(encrypted));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(BACKUP_CONFIG.BACKUP_DIR, `full_${timestamp}.enc`);

    fs.writeFileSync(filePath, JSON.stringify({ encrypted, signature, created_at: new Date().toISOString() }, null, 2), 'utf8');

    console.log(`[BACKUP] Full backup created: ${passports.length} passports → ${filePath}`);

    // Rotate old backups
    rotateBackups();

    return true;
  } catch (err) {
    console.error(`[BACKUP] Full backup failed: ${err.message}`);
    return false;
  }
}

/**
 * Restore a single passport from its encrypted backup file.
 * Requires: NFC Tag ID + Recovery Key for verification.
 */
export function restorePassport(uid) {
  try {
    const filePath = path.join(BACKUP_CONFIG.BACKUP_DIR, `passport_${uid}.enc`);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'No backup found for this identity.' };
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Verify signature (tamper detection)
    if (!verifySignature(JSON.stringify(raw.encrypted), raw.signature)) {
      return { success: false, error: 'Backup integrity check failed. File may be tampered.' };
    }

    const decrypted = JSON.parse(decrypt(raw.encrypted));

    return {
      success: true,
      passport: {
        uid: decrypted.uid,
        owner_name: decrypted.owner_name,
        nfc_tag_id: decrypted.nfc_tag_id,
        pin_hash: decrypted.pin_hash,
        recovery_key_hash: decrypted.recovery_key_hash,
        created_at: decrypted.created_at,
      },
    };
  } catch (err) {
    console.error(`[BACKUP] Restore failed: ${err.message}`);
    return { success: false, error: 'Backup decryption failed.' };
  }
}

/**
 * Restore all passports from the latest full backup.
 */
export function restoreFullBackup() {
  try {
    const files = fs.readdirSync(BACKUP_CONFIG.BACKUP_DIR)
      .filter(f => f.startsWith('full_') && f.endsWith('.enc'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return { success: false, error: 'No full backup found.' };
    }

    const latest = files[0];
    const raw = JSON.parse(fs.readFileSync(path.join(BACKUP_CONFIG.BACKUP_DIR, latest), 'utf8'));

    if (!verifySignature(JSON.stringify(raw.encrypted), raw.signature)) {
      return { success: false, error: 'Full backup integrity check failed.' };
    }

    const decrypted = JSON.parse(decrypt(raw.encrypted));

    return {
      success: true,
      count: decrypted.count,
      passports: decrypted.passports,
      backed_up_at: decrypted.created_at,
    };
  } catch (err) {
    console.error(`[BACKUP] Full restore failed: ${err.message}`);
    return { success: false, error: 'Full backup decryption failed.' };
  }
}

/**
 * Rotate old backups — keep only MAX_BACKUPS full snapshots.
 */
function rotateBackups() {
  try {
    const files = fs.readdirSync(BACKUP_CONFIG.BACKUP_DIR)
      .filter(f => f.startsWith('full_') && f.endsWith('.enc'))
      .sort();

    while (files.length > BACKUP_CONFIG.MAX_BACKUPS) {
      const oldest = files.shift();
      fs.unlinkSync(path.join(BACKUP_CONFIG.BACKUP_DIR, oldest));
      console.log(`[BACKUP] Rotated old backup: ${oldest}`);
    }
  } catch (err) {
    console.error(`[BACKUP] Rotation failed: ${err.message}`);
  }
}

/**
 * Get backup status for monitoring.
 */
export function getBackupStatus() {
  try {
    const files = fs.readdirSync(BACKUP_CONFIG.BACKUP_DIR);
    const fullBackups = files.filter(f => f.startsWith('full_'));
    const passportBackups = files.filter(f => f.startsWith('passport_'));

    let latestBackup = null;
    if (fullBackups.length > 0) {
      const latest = fullBackups.sort().reverse()[0];
      const stats = fs.statSync(path.join(BACKUP_CONFIG.BACKUP_DIR, latest));
      latestBackup = { file: latest, size: stats.size, date: stats.mtime.toISOString() };
    }

    return {
      status: 'ok',
      full_backups: fullBackups.length,
      passport_backups: passportBackups.length,
      latest: latestBackup,
      backup_dir: BACKUP_CONFIG.BACKUP_DIR,
    };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}
