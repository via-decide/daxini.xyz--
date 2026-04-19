import { addJob } from '../../infra/jobs/jobQueue.js';
import { incrementMetric } from '../../infra/observability/metrics.js';
import { logHarness } from '../zayvora/harness.js';

export function queueResearchJob(query, runResearch) {
  logHarness('Research Started', query, { view: 'research' });
  logHarness('Research Engine', 'NEX', { view: 'research' });

  addJob({
    type: 'research',
    run: async () => {
      const results = await runResearch(query);
      logHarness('Research Results', results, { view: 'research' });
      return results;
    }
  });

  incrementMetric('research_jobs');
}
