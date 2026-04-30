/**
 * MODULE_CONTRACT
 * Inputs: credit events { userId, amount, sourceApp, txId, timestamp }
 * Outputs: deterministic credit state snapshots per user
 * Functions: createCreditRegistry(), getBalance(), updateBalance(), recordTransaction(), applyTransaction()
 * Constraints: no negative balances, idempotent tx handling, atomic writes, wallet-ready metadata
 */

function normalizeUserId(userId) {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('invalid_user_id');
  }
  return userId.trim();
}

function cloneUserState(userState) {
  return {
    balance: userState.balance,
    history: userState.history.map((tx) => ({ ...tx }))
  };
}

export function createCreditRegistry() {
  const users = new Map();
  const processedTx = new Set();

  function ensureUser(userId) {
    const id = normalizeUserId(userId);
    if (!users.has(id)) users.set(id, { balance: 0, history: [] });
    return { id, state: users.get(id) };
  }

  function getBalance(userId) {
    const { state } = ensureUser(userId);
    return state.balance;
  }

  function getUserState(userId) {
    const { state } = ensureUser(userId);
    return cloneUserState(state);
  }

  function updateBalance(userId, delta, context = {}) {
    if (!Number.isFinite(delta) || delta === 0) throw new Error('invalid_delta');
    const { state } = ensureUser(userId);
    const next = state.balance + delta;
    if (next < 0) throw new Error('negative_balance');
    state.balance = next;
    return { balance: state.balance, context: { ...context } };
  }

  function recordTransaction(userId, tx) {
    const { state } = ensureUser(userId);
    state.history.push({ ...tx });
    return state.history.length;
  }

  function applyTransaction(tx) {
    const userId = normalizeUserId(tx?.userId);
    const amount = Number(tx?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid_amount');
    if (typeof tx?.type !== 'string' || tx.type.trim() === '') throw new Error('invalid_type');
    if (typeof tx?.txId !== 'string' || tx.txId.trim() === '') throw new Error('invalid_tx_id');
    if (processedTx.has(tx.txId)) {
      return { applied: false, reason: 'duplicate_tx', balance: getBalance(userId) };
    }

    const direction = tx.direction === 'debit' ? -1 : 1;
    const delta = amount * direction;
    const update = updateBalance(userId, delta, { sourceApp: tx.sourceApp || 'unknown' });
    const entry = {
      txId: tx.txId,
      type: tx.type,
      amount,
      direction: direction < 0 ? 'debit' : 'credit',
      sourceApp: tx.sourceApp || 'unknown',
      walletProvider: tx.walletProvider || null,
      timestamp: tx.timestamp || new Date(0).toISOString()
    };
    recordTransaction(userId, entry);
    processedTx.add(tx.txId);
    return { applied: true, balance: update.balance, transaction: entry };
  }

  function reset() {
    users.clear();
    processedTx.clear();
  }

  return { getBalance, getUserState, updateBalance, recordTransaction, applyTransaction, reset };
}

if (typeof window !== 'undefined') {
  window.ZayvoraModules = window.ZayvoraModules || {};
  window.ZayvoraModules.creditRegistry = createCreditRegistry;
}
