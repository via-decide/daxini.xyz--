import { runPlugin } from './pluginLoader.js';
export async function runToolkitPlugin(name, input) {
  const module = await import(`/plugins/${name}.js`);
  return module.run(input);
import { logHarness } from '../zayvora/harness.js';

export async function runToolkitPlugin(name, input) {
  return runPlugin(name, input);
}
