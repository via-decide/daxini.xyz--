const ALLOWED_NODE_TYPES = new Set(['tasks', 'apps', 'repos', 'users', 'articles']);

const state = {
  nodes: new Map(),
  events: []
};

function keyFor(type, id) {
  return `${type}:${id}`;
}

export function registerNode(type, node) {
  if (!ALLOWED_NODE_TYPES.has(type)) {
    throw new Error(`Unsupported memory node type: ${type}`);
  }
  if (!node || !node.id) {
    throw new Error('Memory node requires an id');
  }

  const key = keyFor(type, node.id);
  const current = state.nodes.get(key) || {};
  const next = {
    ...current,
    ...node,
    type,
    updated_at: new Date().toISOString()
  };

  if (!current.created_at) {
    next.created_at = next.updated_at;
  }

  state.nodes.set(key, next);
  pushEvent({ source: 'global-graph', event: 'node.registered', type, node_id: node.id });

  return next;
}

export function pushEvent(event) {
  const entry = {
    id: `ev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...event
  };
  state.events.push(entry);
  if (state.events.length > 2000) {
    state.events.splice(0, state.events.length - 2000);
  }
  return entry;
}

export function getSnapshot() {
  return {
    nodes: Array.from(state.nodes.values()),
    events: [...state.events]
  };
}

export function queryByType(type) {
  return Array.from(state.nodes.values()).filter((node) => node.type === type);
}

export function resetGraph() {
  state.nodes.clear();
  state.events.length = 0;
}
