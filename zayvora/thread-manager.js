(function (global) {
  'use strict';

  const STORAGE = global.ZayvoraThreadStore;

  function buildThread(title) {
    const id = `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    return {
      id,
      title,
      status: 'running',
      created_at: new Date().toISOString(),
      messages: [],
      reasoning_steps: [],
      artifacts: [],
      logs: []
    };
  }

  function pushMemoryEvent(event) {
    if (typeof global.GlobalMemoryGraphClient === 'undefined') return;
    global.GlobalMemoryGraphClient.pushEvent({
      source: 'zayvora-thread-manager',
      ...event
    });
  }

  function createThread(title) {
    const thread = buildThread(title);
    STORAGE.saveThread(thread);
    pushMemoryEvent({ event: 'thread.created', task_id: thread.id, title: thread.title });
    return thread;
  }

  function loadThread(taskId) {
    return STORAGE.loadThread(taskId);
  }

  function listThreads() {
    return STORAGE.listThreads();
  }

  function switchThread(taskId) {
    const thread = loadThread(taskId);
    if (thread) {
      localStorage.setItem('zv_active_thread', thread.id);
    }
    return thread;
  }

  function getActiveThreadId() {
    return localStorage.getItem('zv_active_thread');
  }

  function appendMessage(taskId, message) {
    const thread = loadThread(taskId);
    if (!thread) return null;

    thread.messages = Array.isArray(thread.messages) ? thread.messages : [];
    thread.messages.push({
      role: message.role || 'user',
      content: message.content || '',
      timestamp: message.timestamp || new Date().toISOString()
    });

    STORAGE.saveThread(thread);
    pushMemoryEvent({ event: 'thread.message.appended', task_id: taskId, role: message.role || 'user' });
    return thread;
  }

  function appendStep(taskId, stepData) {
    STORAGE.upsertStep(taskId, {
      ...stepData,
      updated_at: new Date().toISOString()
    });
    pushMemoryEvent({ event: 'thread.step.updated', task_id: taskId, step: stepData.step, status: stepData.status });
    return loadThread(taskId);
  }

  function appendLog(taskId, log) {
    STORAGE.appendLog(taskId, {
      timestamp: new Date().toISOString(),
      ...log
    });
    pushMemoryEvent({ event: 'thread.log.appended', task_id: taskId, type: log.type || 'info' });
    return loadThread(taskId);
  }

  function updateStatus(taskId, status) {
    const thread = loadThread(taskId);
    if (!thread) return null;
    thread.status = status;
    STORAGE.saveThread(thread);
    pushMemoryEvent({ event: 'thread.status.updated', task_id: taskId, status });
    return thread;
  }

  async function executeTasks(taskFns, options) {
    const config = options || {};
    const concurrency = Number(config.concurrency || 2);
    const queue = Array.isArray(taskFns) ? taskFns.slice() : [];
    const results = [];

    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        const startedAt = Date.now();
        try {
          const result = await item.run();
          results.push({ id: item.id, status: 'completed', duration_ms: Date.now() - startedAt, result });
        } catch (error) {
          results.push({ id: item.id, status: 'failed', duration_ms: Date.now() - startedAt, error: String(error?.message || error) });
        }
      }
    }

    const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
    await Promise.all(workers);
    pushMemoryEvent({ event: 'thread.multi_task.executed', count: results.length, concurrency: Math.max(1, concurrency) });
    return results;
  }

  global.ZayvoraThreadManager = {
    createThread,
    loadThread,
    listThreads,
    switchThread,
    getActiveThreadId,
    appendMessage,
    appendStep,
    appendLog,
    updateStatus,
    executeTasks
  };
})(window);
