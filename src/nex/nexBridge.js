import { routeAction } from '../router/actions/router.js';
export async function runResearch(query) {
  const res = await fetch('https://logichub.app/api/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
import { addJob } from '../../infra/jobs/jobQueue.js';
import { incrementMetric } from '../../infra/observability/metrics.js';
import { logHarness } from '../zayvora/harness.js';

export async function runResearch(query) {
  return routeAction('research', query);
}

export function queueResearchJob(query) {
  return runResearch(query);
  return res.json();
}
