/*
  training/prCollector.js
  Fetches Pull Requests from the last 10 days for specified repositories.
*/

import fs from 'fs';
import path from 'path';

const REPOS = ['zayvora', 'zayvora-login', 'Orchade', 'Mars', 'Newslatters-articles'];
const OWNER = 'via-decide';
const TOKEN = process.env.GITHUB_TOKEN; // From .env

const DAYS_AGO = 10;
const SINCE_DATE = new Date();
SINCE_DATE.setDate(SINCE_DATE.getDate() - DAYS_AGO);

async function fetchPRs(repo) {
    console.log(`[COLLECTOR] Fetching PRs for ${OWNER}/${repo}...`);
    const url = `https://api.github.com/repos/${OWNER}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=50`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        
        const prs = await response.json();
        
        // Filter by date and owner
        const relevantPRs = prs.filter(pr => {
            const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
            return mergedAt && mergedAt >= SINCE_DATE && pr.user.login === OWNER;
        });

        console.log(`[COLLECTOR] Found ${relevantPRs.length} relevant PRs in ${repo}.`);
        
        const detailedPRs = [];
        for (const pr of relevantPRs) {
            const diffResponse = await fetch(pr.diff_url, {
                headers: { 'Authorization': `token ${TOKEN}` }
            });
            const diff = await diffResponse.text();
            
            detailedPRs.push({
                repo,
                number: pr.number,
                title: pr.title,
                body: pr.body,
                merged_at: pr.merged_at,
                diff: diff,
                url: pr.html_url
            });
        }
        
        return detailedPRs;
    } catch (err) {
        console.error(`[ERROR] Failed to fetch ${repo}:`, err.message);
        return [];
    }
}

async function run() {
    let allPRs = [];
    for (const repo of REPOS) {
        const prs = await fetchPRs(repo);
        allPRs = allPRs.concat(prs);
    }
    
    const outputPath = path.join(process.cwd(), 'training/data/pr_dataset.json');
    fs.writeFileSync(outputPath, JSON.stringify(allPRs, null, 2));
    console.log(`[COLLECTOR] Saved ${allPRs.length} PRs to ${outputPath}`);
}

run();
