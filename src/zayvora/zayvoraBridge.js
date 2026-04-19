import { logEvent } from '../../infra/observability/logger.js';
import { incrementMetric } from '../../infra/observability/metrics.js';
import { logHarness } from './harness.js';

export async function runZayvoraQuery(query, runQuery) {
  logEvent('zayvora-query', query);
  incrementMetric('zayvora_requests');

  logHarness('Decompose', query, { view: 'reasoning' });

  const result = await runQuery(query);

  logHarness('Retrieve Context', result?.context ?? result, { view: 'reasoning' });
  logHarness('Synthesize', result?.analysis ?? result, { view: 'reasoning' });
  logHarness('Calculate', result?.decision ?? result, { view: 'reasoning' });
  logHarness('Verify', result?.checks ?? result, { view: 'reasoning' });
  logHarness('Execute', result?.action ?? result, { view: 'execution' });

  return result;
}
