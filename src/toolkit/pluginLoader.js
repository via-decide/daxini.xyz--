import { routeAction } from '../router/actions/router.js';

export async function runPlugin(name, input) {
  return routeAction('execute', {
    plugin: name,
    input
  });
}
