/**
 * MODULE_CONTRACT
 * Inputs: registry dependency + sync event payloads from Alchemist/Daxini/Zayvora apps
 * Outputs: validated transaction results + broadcast payloads
 * Functions: createCreditSyncEngine(), validateTransaction(), processEvent(), getBalance(), updateBalance(), recordTransaction()
 * Constraints: deterministic validation, anti-double-spend, app-agnostic wallet abstraction
 */

const ALLOWED_APPS = new Set(['alchemist', 'daxini', 'zayvora']);

export function createCreditSyncEngine({ registry, broadcaster } = {}) {
  if (!registry) throw new Error('registry_required');

  function validateTransaction(event) {
    if (!event || typeof event !== 'object') return { ok: false, error: 'invalid_event' };
    if (!ALLOWED_APPS.has((event.app || '').toLowerCase())) return { ok: false, error: 'unknown_app' };
    if (!['credit', 'debit'].includes(event.direction)) return { ok: false, error: 'invalid_direction' };
    if (!Number.isFinite(Number(event.amount)) || Number(event.amount) <= 0) return { ok: false, error: 'invalid_amount' };
    if (typeof event.userId !== 'string' || event.userId.trim() === '') return { ok: false, error: 'invalid_user_id' };
    if (typeof event.txId !== 'string' || event.txId.trim() === '') return { ok: false, error: 'invalid_tx_id' };
    return { ok: true };
  }

  function getBalance(userId) {
    return registry.getBalance(userId);
  }

  function updateBalance(userId, delta) {
    return registry.updateBalance(userId, delta, { actor: 'sync-engine' });
  }

  function recordTransaction(userId, type, amount, metadata = {}) {
    return registry.recordTransaction(userId, { type, amount, ...metadata });
  }

  function processEvent(event) {
    const validation = validateTransaction(event);
    if (!validation.ok) return { ok: false, ...validation };

    const tx = {
      userId: event.userId,
      txId: event.txId,
      type: event.type || 'app_sync',
      amount: Number(event.amount),
      direction: event.direction,
      sourceApp: event.app.toLowerCase(),
      walletProvider: event.wallet?.provider || null,
      timestamp: event.timestamp || new Date(0).toISOString()
    };

    const result = registry.applyTransaction(tx);
    const payload = {
      userId: tx.userId,
      balance: registry.getBalance(tx.userId),
      sourceApp: tx.sourceApp,
      txId: tx.txId,
      applied: result.applied
    };

    if (typeof broadcaster === 'function') broadcaster(payload);
    return { ok: true, result, payload };
  }

  return { validateTransaction, processEvent, getBalance, updateBalance, recordTransaction };
}

if (typeof window !== 'undefined') {
  window.ZayvoraModules = window.ZayvoraModules || {};
  window.ZayvoraModules.creditSyncEngine = createCreditSyncEngine;
}
