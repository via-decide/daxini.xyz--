const LOCAL_TOOLKIT_ORIGIN = 'http://localhost:7070';
const API_ROOT = '/toolkit';
const CACHE_NAME = 'zayvora-toolkit-cache-v1';

function buildCacheKey(endpoint, payload) {
  const encoded = encodeURIComponent(JSON.stringify(payload ?? {}));
  return `${location.origin}/__toolkit_cache__/${endpoint}?payload=${encoded}`;
}

async function readCachedJson(endpoint, payload) {
  if (typeof caches === 'undefined') return null;
  const cache = await caches.open(CACHE_NAME);
  const match = await cache.match(buildCacheKey(endpoint, payload));
  if (!match) return null;
  return match.json();
}

async function writeCachedJson(endpoint, payload, data) {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    buildCacheKey(endpoint, payload),
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Toolkit request failed (${response.status})`);
  }

  return response.json();
}

async function requestToolkit(endpoint, payload) {
  const targets = [
    `${LOCAL_TOOLKIT_ORIGIN}${API_ROOT}/${endpoint}`,
    `${API_ROOT}/${endpoint}`
  ];

  for (const target of targets) {
    try {
      const data = await postJson(target, payload);
      await writeCachedJson(endpoint, payload, data);
      return data;
    } catch (error) {
      // Try next target before falling back to cache.
    }
  }

  const cached = await readCachedJson(endpoint, payload);
  if (cached) {
    return {
      ...cached,
      offline: true,
      source: cached.source || 'service-worker-cache'
    };
  }

  throw new Error('Toolkit is unavailable (localhost:7070 offline and no cached response).');
}

export async function toolkitPlan(query) {
  return requestToolkit('plan', { query });
}

export async function toolkitSearch(query) {
  return requestToolkit('search', { query });
}

export async function toolkitReason(query, knowledge) {
  return requestToolkit('reason', { query, knowledge });
}

export async function toolkitVerify(query, result) {
  return requestToolkit('verify', { query, result });
}

export async function toolkitNexResearch(query) {
  return requestToolkit('nexResearch', { query });
}
