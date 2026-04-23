import { runPlugin } from './pluginLoader.js';
import { logHarness } from '../zayvora/harness.js';

export async function runToolkitPlugin(name, input) {
  logHarness('Toolkit Plugin', { name, input }, { view: 'toolkit' });
  const result = await runPlugin(name, input);
  logHarness('Toolkit Result', result, { view: 'toolkit' });
  return result;
}
