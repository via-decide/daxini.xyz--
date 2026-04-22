export async function loadUpdates() {
  const res = await fetch('/updates/whats-new.json');
  const updates = await res.json();
  return updates;
}
