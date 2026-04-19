export async function runZayvoraQuery(query) {
  console.log('Zayvora query:', query);
import { logEvent } from '../../infra/observability/logger.js';
import { incrementMetric } from '../../infra/observability/metrics.js';
import { logHarness } from './harness.js';

  const response = await fetch('https://logichub.app/api/reason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  return response.json();
  logHarness('Decompose', query, { view: 'reasoning' });

  const result = await runQuery(query);

  logHarness('Retrieve Context', result?.context ?? result, { view: 'reasoning' });
  logHarness('Synthesize', result?.analysis ?? result, { view: 'reasoning' });
  logHarness('Calculate', result?.decision ?? result, { view: 'reasoning' });
  logHarness('Verify', result?.checks ?? result, { view: 'reasoning' });
  logHarness('Execute', result?.action ?? result, { view: 'execution' });

  return result;
}
