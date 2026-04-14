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

// v3 Reputation Engine Table
db.prepare(`
    CREATE TABLE IF NOT EXISTS reputation_scores (
        target_id TEXT PRIMARY KEY, -- ip_hash or fingerprint_id
        target_type TEXT,            -- 'ip' or 'fp'
        score REAL DEFAULT 0.0,
        trust_flags TEXT,
        last_incident DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// v3 Network Graph Table
db.prepare(`
    CREATE TABLE IF NOT EXISTS threat_edges (
        source_id TEXT,
        target_id TEXT,
        relation_type TEXT,
        weight REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(source_id, target_id, relation_type)
    )
`).run();

// v3 Anomaly Statistics Table
db.prepare(`
    CREATE TABLE IF NOT EXISTS security_statistics (
        target_id TEXT,
        window_start INTEGER, -- Unix timestamp
        req_count INTEGER DEFAULT 0,
        err_count INTEGER DEFAULT 0,
        unique_endpoints TEXT, -- JSON array
        PRIMARY KEY(target_id, window_start)
    )
`).run();

console.log('[SECURITY] Telemetry database initialized.');

export default db;
