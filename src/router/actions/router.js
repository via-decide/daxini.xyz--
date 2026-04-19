import { emit } from '../events/eventBus.js';
import { resolveAction } from '../registry/actionRegistry.js';

export async function routeAction(action, payload) {
  emit('router:action', { action, payload });

  const handler = resolveAction(action);
  if (!handler) {
    const passthrough = { action, payload, status: 'unhandled' };
    emit('router:result', passthrough);
    return passthrough;
  }

  const result = await handler(payload);
  emit('router:result', { action, result, status: 'ok' });
  return result;
}
