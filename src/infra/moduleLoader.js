import { incrementMetric } from '../../infra/observability/metrics.js';
import { logHarness } from '../zayvora/harness.js';

const MODULE_TO_METRIC = {
  orchade: 'module_launches',
  mars: 'module_launches',
  skillhex: 'module_launches'
};

export function launchModule(moduleName, launchFn) {
  logHarness('Opening Module', moduleName, { view: 'execution' });

  if (MODULE_TO_METRIC[moduleName]) {
    incrementMetric(MODULE_TO_METRIC[moduleName]);
  }

  return launchFn(moduleName);
}
