/* 
  daxini.xyz/api/index.js (Vercel Serverless Function)
  MISSION: AUTONOMOUS BUG ASSASSIN - RESTORE ENDPOINTS
*/

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Logging
  console.log(`[ZAYVORA_API] ${req.method} ${path}`);

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // --- AUTH ENDPOINTS ---
    if (path.startsWith('/api/auth/check')) {
      return res.status(200).json({ authenticated: true, user: { id: 'demo', name: 'Dharam Daxini' } });
    }
    
    if (path.startsWith('/api/auth/login')) {
      return res.status(200).json({ success: true, token: 'zayvora_prime_token_' + Date.now() });
    }

    // --- REPO ENDPOINTS ---
    if (path.startsWith('/api/repos/')) {
      const parts = path.split('/').filter(Boolean);
      const owner = parts[2] || 'via-decide';
      const repo = parts[3] || 'zayvora';
      
      const githubToken = process.env.GITHUB_TOKEN || 'MISSING_TOKEN';
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { 'Authorization': `token ${githubToken}` }
      });
      const data = await response.json();
      return res.status(200).json(data);
    }
    
    if (path.startsWith('/api/git/repos')) {
      const githubToken = process.env.GITHUB_TOKEN || 'MISSING_TOKEN';
      const response = await fetch(`https://api.github.com/orgs/via-decide/repos`, {
        headers: { 'Authorization': `token ${githubToken}` }
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // --- WORKSPACE ENDPOINTS ---
    if (path.startsWith('/api/workspace')) {
      return res.status(200).json({ status: 'active', layout: 'mission-control', context: 'zayvora-main' });
    }

    // --- FALLBACK ---
    return res.status(404).json({ error: 'Endpoint not found', path });

  } catch (error) {
    console.error(`[ZAYVORA_ERROR]`, error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
