import assert from 'node:assert/strict';
import { createCreditRegistry } from './credit-registry.js';
import { createCreditSyncEngine } from './credit-sync.js';

async function run() {
  const registry = createCreditRegistry();
  const events = [];
  const engine = createCreditSyncEngine({ registry, broadcaster: (payload) => events.push(payload) });

  const credit = engine.processEvent({
    app: 'Alchemist',
    userId: 'user-1',
    txId: 'tx-1',
    type: 'purchase_credit',
    direction: 'credit',
    amount: 25,
    wallet: { provider: 'razorpay' }
  });
  assert.equal(credit.ok, true);
  assert.equal(registry.getBalance('user-1'), 25);

  const debit = engine.processEvent({
    app: 'Daxini',
    userId: 'user-1',
    txId: 'tx-2',
    type: 'content_unlock',
    direction: 'debit',
    amount: 10
  });
  assert.equal(debit.ok, true);
  assert.equal(registry.getBalance('user-1'), 15);

  const duplicate = engine.processEvent({
    app: 'Zayvora',
    userId: 'user-1',
    txId: 'tx-2',
    type: 'duplicate',
    direction: 'debit',
    amount: 10
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.result.applied, false);
  assert.equal(registry.getBalance('user-1'), 15);

  const invalid = engine.processEvent({ app: 'Unknown', userId: 'user-1', txId: 'tx-3', direction: 'credit', amount: 1 });
  assert.equal(invalid.ok, false);

  assert.equal(events.length, 3);
  assert.equal(events[0].balance, 25);
  assert.equal(events[1].balance, 15);
  assert.equal(events[2].applied, false);

  console.log('credit-sync tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
