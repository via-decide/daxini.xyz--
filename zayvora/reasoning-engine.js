(function (global) {
  'use strict';

  const STORAGE = global.ZayvoraThreadStore;

  function emitTimelineEvent(payload) {
    window.dispatchEvent(new CustomEvent('zayvora-timeline-event', { detail: payload }));
  }

  function recordStep(taskId, step, label) {
    const stepData = {
      step,
      label,
      status: 'running',
      timestamp: new Date().toISOString(),
    };

    STORAGE.upsertStep(taskId, stepData);
    emitTimelineEvent({ taskId, step: stepData });
    return stepData;
  }

  function updateStepStatus(taskId, step, status) {
    const stepData = {
      step,
      status,
      timestamp: new Date().toISOString(),
    };

    STORAGE.upsertStep(taskId, stepData);
    emitTimelineEvent({ taskId, step: stepData });
  }

  global.ZayvoraReasoningEngine = {
    recordStep,
    updateStepStatus,
    emitTimelineEvent,
  };
})(window);
