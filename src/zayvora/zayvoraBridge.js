import { routeAction } from '../router/actions/router.js';
import { logHarness } from './harness.js';

export async function handleZayvoraQuery(query) {
  return routeAction('reason', query);
}

export async function runZayvoraQuery(query) {
  logHarness('Decompose', query, { view: 'reasoning' });

  const response = await fetch('https://logichub.app/api/reason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const result = await response.json();

  logHarness('Retrieve Context', result?.context ?? result, { view: 'reasoning' });
  logHarness('Synthesize', result?.analysis ?? result, { view: 'reasoning' });
  logHarness('Calculate', result?.decision ?? result, { view: 'reasoning' });
  logHarness('Verify', result?.checks ?? result, { view: 'reasoning' });
  logHarness('Execute', result?.action ?? result, { view: 'execution' });

  return result;
}
