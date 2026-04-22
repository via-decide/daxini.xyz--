import { routeAction } from '../router/actions/router.js';

export function openModule(module) {
  routeAction('open-module', module);
}
