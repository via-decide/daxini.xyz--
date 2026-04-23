/*
  security/initDB.js
  Sovereign Database Orchestrator (Lazy Load Edition)
  Guarantees stability on Vercel by isolating the better-sqlite3 native driver.
*/

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Internal state
let cachedDB = null;
let _isMock = false;

/**
 * Mock Database to keep the system alive if better-sqlite3 vanishes
 */
class MockDatabase {
    constructor() {
        console.warn("[SECURITY] WARNING: Native DB driver unavailable. Using In-Memory Mock.");
        _isMock = true;
    }
    prepare() {
        return {
            run: () => ({ changes: 0, lastInsertRowid: 0 }),
            get: () => undefined,
            all: () => []
        };
    }
    transaction(fn) { return fn; }
    close() {}
}

/**
 * Retrieves the database instance lazily.
 * Guarantees a valid object (Mock or SQLite) is always returned.
 */
export async function getDB() {
    if (cachedDB) {return cachedDB;}

    try {
        // Dynamic import isolates the library crash
        const { default: Database } = await import('better-sqlite3');
        
        try {
            const dbPath = path.join(__dirname, '../data/telemetry.db');
            cachedDB = new Database(dbPath);
        } catch (_e) {
            // Rollback to in-memory if disk-write is forbidden (Vercel)
            cachedDB = new Database(':memory:');
        }
    } catch (_criticalErr) {
        // Ultimate fallback
        cachedDB = new MockDatabase();
    }

    // Initialize Schema on first boot
    const schema = [
        `CREATE TABLE IF NOT EXISTS security_events (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip_hash TEXT, endpoint TEXT, threat_score REAL)`,
        `CREATE TABLE IF NOT EXISTS reputation_scores (target_id TEXT PRIMARY KEY, score REAL DEFAULT 0.0)`,
        `CREATE TABLE IF NOT EXISTS threat_edges (source_id TEXT, target_id TEXT, PRIMARY KEY(source_id, target_id))`,
        `CREATE TABLE IF NOT EXISTS sovereign_passports (
            uid TEXT PRIMARY KEY,
            owner_name TEXT,
            nfc_tag_id TEXT UNIQUE,
            pin_hash TEXT,
            recovery_key_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    schema.forEach(sql => {
        try { cachedDB.prepare(sql).run(); } catch(_err) { /* ignore schema noise */ }
    });

    return cachedDB;
}

// Support older static imports by exporting a proxy or the getter
export default {
    prepare: (...args) => {
        if (!cachedDB) {
            console.error("[SECURITY] FATAL: Async DB used before initialization. Re-routing through mock.");
            return (new MockDatabase()).prepare(...args);
        }
        return cachedDB.prepare(...args);
    }
};
