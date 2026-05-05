import assert from 'node:assert/strict';
import { safeApiHandler } from './fixed-api-handler.js';

function createRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

async function run() {
  const getRes = createRes();
  await safeApiHandler({ method: 'GET', url: '/api/health' }, getRes);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.status, 'ok');

  const postRes = createRes();
  await safeApiHandler({ method: 'POST', url: '/api/health' }, postRes);
  assert.equal(postRes.statusCode, 405);

  const brokenRes = createRes();
  await safeApiHandler({ method: 'GET', url: '/api/health' }, null);
  assert.equal(brokenRes.statusCode, 0);

  console.log('vercel-function tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
