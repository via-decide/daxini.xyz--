/*
  security/initDB.js
  Initializes the telemetry database for security events.
*/

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/telemetry.db');
const db = new Database(dbPath);

// Create security_events table
db.prepare(`
    CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_hash TEXT,
        fingerprint_id TEXT,
        endpoint TEXT,
        behavior_pattern TEXT,
        user_agent TEXT,
        suspicion_delta INTEGER,
        threat_score REAL
    )
`).run();

console.log('[SECURITY] Telemetry database initialized.');

export default db;
