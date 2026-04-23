(function (global) {
  'use strict';

  const THREAD_INDEX_KEY = 'zv_thread_index';
  const THREAD_FILE_PREFIX = 'zv_thread_file:';

  function readIndex() {
    try {
      const raw = localStorage.getItem(THREAD_INDEX_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (_error) {
      return [];
    }
  }

  function writeIndex(index) {
    localStorage.setItem(THREAD_INDEX_KEY, JSON.stringify(index));
  }

  function threadKey(taskId) {
    return `${THREAD_FILE_PREFIX}/zayvora/threads/${taskId}.json`;
  }

  function saveThread(thread) {
    if (!thread || !thread.id) {return;}
    localStorage.setItem(threadKey(thread.id), JSON.stringify(thread));

    const index = readIndex();
    const nextIndex = [thread.id, ...index.filter((id) => id !== thread.id)];
    writeIndex(nextIndex.slice(0, 50));
  }

  function loadThread(taskId) {
    try {
      const raw = localStorage.getItem(threadKey(taskId));
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function listThreads() {
    return readIndex()
      .map(loadThread)
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  function appendLog(taskId, logEntry) {
    const thread = loadThread(taskId);
    if (!thread) {return;}
    thread.logs = Array.isArray(thread.logs) ? thread.logs : [];
    thread.logs.push(logEntry);
    saveThread(thread);
  }

  function appendArtifact(taskId, artifact) {
    const thread = loadThread(taskId);
    if (!thread) {return;}
    thread.artifacts = Array.isArray(thread.artifacts) ? thread.artifacts : [];
    thread.artifacts.push(artifact);
    saveThread(thread);
  }

  function upsertStep(taskId, stepData) {
    const thread = loadThread(taskId);
    if (!thread) {return;}

    thread.reasoning_steps = Array.isArray(thread.reasoning_steps) ? thread.reasoning_steps : [];
    const idx = thread.reasoning_steps.findIndex((s) => s.step === stepData.step);
    if (idx >= 0) {
      thread.reasoning_steps[idx] = Object.assign({}, thread.reasoning_steps[idx], stepData);
    } else {
      thread.reasoning_steps.push(stepData);
      thread.reasoning_steps.sort((a, b) => a.step - b.step);
    }

    saveThread(thread);
  }

  global.ZayvoraThreadStore = {
    saveThread,
    loadThread,
    listThreads,
    appendLog,
    appendArtifact,
    upsertStep,
  };
})(window);
