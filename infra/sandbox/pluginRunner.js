import { incrementMetric } from '../observability/metrics.js';

export async function runPlugin(plugin, input) {
  const module = await import(`/plugins/${plugin}.js`);

  if (!module.run) {
    throw new Error('Plugin missing run() function');
  }

  incrementMetric('plugin_calls');

  return module.run(input);
}
