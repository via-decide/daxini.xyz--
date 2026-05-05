import assert from 'node:assert/strict';
import { createRuntimeFallback, detectRuntimeMode } from './runtime-fallback.js';

async function run() {
  assert.equal(detectRuntimeMode({ hasWindow: true, locationHref: 'https://via-decide.github.io/x', backendUrl: '' }), 'offline-static');
  assert.equal(detectRuntimeMode({ hasWindow: false }), 'server');

  const offline = createRuntimeFallback({ hasWindow: true, locationHref: 'https://via-decide.github.io/x' });
  const offlineRes = await offline.call('/api/zayvora/execute', { method: 'POST', body: '{}' });
  assert.equal(offline.mode, 'offline-static');
  assert.equal(offlineRes.ok, false);
  assert.equal(offlineRes.status, 503);

  const connected = createRuntimeFallback({
    hasWindow: true,
    locationHref: 'https://app.example.com',
    backendUrl: 'https://api.example.com',
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => '{"ok":true}' })
  });
  const connectedRes = await connected.call('/api/health');
  assert.equal(connected.mode, 'connected');
  assert.equal(connectedRes.ok, true);
  assert.equal(connectedRes.status, 200);

  console.log('runtime-fallback tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
