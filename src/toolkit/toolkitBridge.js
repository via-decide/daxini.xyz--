export async function runToolkitPlugin(name, input) {
  const module = await import(`/plugins/${name}.js`);
  return module.run(input);
import { logHarness } from '../zayvora/harness.js';

export async function runToolkitPlugin(name, input, executePlugin) {
  logHarness('Toolkit Plugin', { plugin: name, input }, { view: 'execution' });
  const result = await executePlugin(name, input);
  logHarness('Plugin Result', result, { view: 'execution' });
  return result;
}
