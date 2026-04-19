const actionHandlers = new Map();

export function registerAction(actionName, handler) {
  actionHandlers.set(actionName, handler);
}

export function resolveAction(actionName) {
  return actionHandlers.get(actionName);
}
