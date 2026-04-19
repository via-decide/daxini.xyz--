import { on } from './events/eventBus.js';

export function initRouterDebug() {
  on('*', (event) => {
    console.log('Router Event:', event);
  });
}
