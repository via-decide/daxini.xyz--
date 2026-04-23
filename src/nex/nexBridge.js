import { logHarness } from '../zayvora/harness.js';

export async function runResearch(query) {
  logHarness('Research Task', query, { view: 'research' });
  const res = await fetch('https://logichub.app/api/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const result = await res.json();
  logHarness('Research Result', result, { view: 'research' });
  return result;
}

export function queueResearchJob(query) {
  return runResearch(query);
}
