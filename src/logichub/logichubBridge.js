import { logHarness } from '../zayvora/harness.js';

export async function executeAction(task) {
  const res = await fetch('https://logichub.app/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  });

  return res.json();
}

export async function runExecutionTask(task, executeTask) {
  logHarness('Execution Task', task, { view: 'execution' });
  const result = await executeTask(task);
  logHarness('Execution Result', result, { view: 'execution' });
  return result;
}
