export function logEvent(type, data) {
  const entry = {
    type,
    data,
    timestamp: new Date().toISOString()
  };

  console.log('[OBS]', entry);
}
