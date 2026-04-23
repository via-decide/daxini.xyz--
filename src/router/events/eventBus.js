const listeners = new Map();

function getBucket(eventName) {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }

  return listeners.get(eventName);
}

export function on(eventName, handler) {
  const bucket = getBucket(eventName);
  bucket.add(handler);

  return () => {
    bucket.delete(handler);
    if (!bucket.size) {listeners.delete(eventName);}
  };
}

export function emit(eventName, payload = {}) {
  const event = {
    name: eventName,
    payload,
    timestamp: Date.now()
  };

  const specific = listeners.get(eventName) || new Set();
  const wildcard = listeners.get('*') || new Set();

  [...specific, ...wildcard].forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error('[router:eventBus] listener failed', error);
    }
  });

  return event;
}
