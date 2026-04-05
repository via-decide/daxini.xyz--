/* 
  daxini.xyz/api/check.js (Vercel Serverless Function)
  MISSION: AUTONOMOUS BUG ASSASSIN - PHASE 2
*/

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, ""); // Normalize path (remove trailing slash)

  console.log(`[ZAYVORA_PRIME] ${req.method} ${path}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // --- HEALTH / MISSION ---
    if (path === '/api/check' || path === '/api') {
      return res.status(200).json({ status: 'HEALTHY', mission: 'UNSHACKLED', version: '2.04' });
    }

    // --- AUTH ---
    if (path === '/api/auth/check') {
      return res.status(200).json({ authenticated: true, user: { id: 'daxini_01', name: 'Dharam Daxini' } });
    }
    if (path === '/api/auth/login') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      return res.status(200).json({ success: true, token: 'Bearer sovereign_' + Math.random().toString(36).substring(7) });
    }
    if (path === '/api/auth/register') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      return res.status(200).json({ success: true, message: 'Account created successfully' });
    }
    if (path === '/api/auth/forgot-password') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      return res.status(200).json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    }
    if (path === '/api/auth/logout') {
      return res.status(200).json({ success: true });
    }

    // --- USER WALLET ---
    if (path.startsWith('/api/user-wallet/')) {
      return res.status(200).json({ available_credits: 0, currency: 'INR' });
    }

    // --- REPO ANALYZE ---
    if (path === '/api/repo-analyze') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      return res.status(200).json({ success: true, structure: { files: [], languages: [] } });
    }

    // --- CREDITS ---
    if (path === '/api/credits/balance' || path.startsWith('/api/credits/balance/')) {
      return res.status(200).json({ available_credits: 0 });
    }

    // --- GITHUB PROXIES ---
    const headers = { 
        'Authorization': `token ${process.env.GITHUB_TOKEN || ''}`,
        'User-Agent': 'Zayvora-Sovereign-Suite'
    };

    if (path === '/api/git/repos') {
      const resp = await fetch(`https://api.github.com/orgs/via-decide/repos?sort=updated&per_page=10`, { headers });
      return res.status(200).json(await resp.json());
    }

    if (path === '/api/git/pulls') {
      const repos = ['zayvora', 'daxini.xyz', 'decide.engine-tools'];
      const results = await Promise.all(repos.map(async (r) => {
        const resp = await fetch(`https://api.github.com/repos/via-decide/${r}/pulls`, { headers });
        const items = await resp.json();
        return Array.isArray(items) ? items : [];
      }));
      return res.status(200).json(results.flat());
    }

    if (path.startsWith('/api/repos/')) {
        const parts = path.split('/').filter(Boolean);
        const owner = parts[1] || 'via-decide'; 
        const repo = parts[2] || 'zayvora';
        const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        return res.status(200).json(await resp.json());
    }

    // --- WORKSPACE ---
    if (path === '/api/workspace/state') {
      return res.status(200).json({ 
        active_panels: ['BRAIN_INTERFACE', 'LIVE_PREVIEW', 'WORKSPACE_ENGINE'],
        mode: 'SOVEREIGN_PRIME',
        context: 'Researching Earth-scale decision systems'
      });
    }

    return res.status(404).json({ error: 'Endpoint not found', path });

  } catch (error) {
    console.error(`[ZAYVORA_CRITICAL]`, error);
    return res.status(500).json({ error: 'System Failure', details: error.message });
  }
}
