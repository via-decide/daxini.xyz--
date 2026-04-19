import { logHarness } from '../zayvora/harness.js';

export async function runExecutionTask(task, executeTask) {
  logHarness('Execution Task', task, { view: 'execution' });
  const result = await executeTask(task);
  logHarness('Execution Result', result, { view: 'execution' });
  return result;
}
