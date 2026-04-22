'use strict';

/**
 * runtimeGuard.js — Runtime Protection Layer
 * 
 * Detects and prevents:
 *   - Excessive execution time (infinite loops)
 *   - High memory consumption
 *   - Repeated rapid execution calls (DoS via compute)
 *   - Resource exhaustion attacks
 * 
 * Auto-stops execution and shows warnings.
 */

// ── Execution Tracking ─────────────────────────────────────
const executionTracker = new Map();

const RUNTIME_CONFIG = {
  MAX_EXECUTION_TIME_MS: 30 * 1000,      // 30 seconds per execution
  MAX_CONCURRENT_EXECUTIONS: 3,           // Per identity
  MAX_EXECUTIONS_PER_MINUTE: 10,          // Rate limit on executions
  EXECUTION_WINDOW_MS: 60 * 1000,         // 1 minute window
  MEMORY_WARNING_MB: 512,                 // Warn at 512MB
  MEMORY_KILL_MB: 1024,                   // Kill at 1GB
  CLEANUP_INTERVAL_MS: 60 * 1000,         // Cleanup every minute
};

class ExecutionContext {
  constructor(id, identity) {
    this.id = id;
    this.identity = identity;
    this.startedAt = Date.now();
    this.status = 'running'; // running | completed | killed | timeout
    this.abortController = new AbortController();
    this.timer = null;
  }

  /**
   * Set an auto-kill timer.
   */
  setDeadline(maxMs = RUNTIME_CONFIG.MAX_EXECUTION_TIME_MS) {
    this.timer = setTimeout(() => {
      if (this.status === 'running') {
        this.kill('timeout', `Execution exceeded ${maxMs}ms deadline`);
      }
    }, maxMs);
  }

  kill(reason, message) {
    this.status = 'killed';
    this.abortController.abort();
    if (this.timer) clearTimeout(this.timer);
    console.warn(`[RUNTIME_GUARD] Execution ${this.id} killed: ${reason} — ${message}`);
  }

  complete() {
    this.status = 'completed';
    if (this.timer) clearTimeout(this.timer);
  }

  get signal() {
    return this.abortController.signal;
  }

  get elapsedMs() {
    return Date.now() - this.startedAt;
  }
}

/**
 * Get or create execution tracking for an identity.
 */
function getIdentityTracker(identity) {
  if (!executionTracker.has(identity)) {
    executionTracker.set(identity, {
      active: new Map(),
      history: [],
    });
  }
  return executionTracker.get(identity);
}

/**
 * Request permission to execute something.
 * Returns: { allowed: boolean, reason: string, context?: ExecutionContext }
 */
export function requestExecution(identity) {
  const tracker = getIdentityTracker(identity);
  const now = Date.now();

  // Check concurrent executions
  const activeCount = tracker.active.size;
  if (activeCount >= RUNTIME_CONFIG.MAX_CONCURRENT_EXECUTIONS) {
    return {
      allowed: false,
      reason: 'max_concurrent',
      message: `Too many concurrent executions (${activeCount}/${RUNTIME_CONFIG.MAX_CONCURRENT_EXECUTIONS}). Please wait.`,
    };
  }

  // Check rate limit (executions per minute)
  const recentExecutions = tracker.history.filter(
    h => now - h.startedAt < RUNTIME_CONFIG.EXECUTION_WINDOW_MS
  );
  if (recentExecutions.length >= RUNTIME_CONFIG.MAX_EXECUTIONS_PER_MINUTE) {
    return {
      allowed: false,
      reason: 'rate_limit',
      message: `Execution rate limit reached (${RUNTIME_CONFIG.MAX_EXECUTIONS_PER_MINUTE}/min). Please slow down.`,
    };
  }

  // Create execution context
  const execId = `exec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const context = new ExecutionContext(execId, identity);
  context.setDeadline();

  tracker.active.set(execId, context);
  tracker.history.push({ startedAt: now, id: execId });

  // Trim history
  if (tracker.history.length > 100) {
    tracker.history = tracker.history.slice(-50);
  }

  return {
    allowed: true,
    reason: 'ok',
    context,
  };
}

/**
 * Mark an execution as complete.
 */
export function completeExecution(identity, execId) {
  const tracker = getIdentityTracker(identity);
  const context = tracker.active.get(execId);
  if (context) {
    context.complete();
    tracker.active.delete(execId);
  }
}

/**
 * Force-kill an execution.
 */
export function killExecution(identity, execId, reason = 'manual') {
  const tracker = getIdentityTracker(identity);
  const context = tracker.active.get(execId);
  if (context) {
    context.kill(reason, 'Force killed');
    tracker.active.delete(execId);
  }
}

/**
 * Check system memory usage and return warnings.
 */
export function checkMemoryPressure() {
  const used = process.memoryUsage();
  const heapMB = Math.round(used.heapUsed / 1024 / 1024);
  const rssMB = Math.round(used.rss / 1024 / 1024);

  if (rssMB > RUNTIME_CONFIG.MEMORY_KILL_MB) {
    return {
      status: 'critical',
      message: `Memory critical: ${rssMB}MB RSS. Executions should be halted.`,
      heapMB,
      rssMB,
    };
  }

  if (rssMB > RUNTIME_CONFIG.MEMORY_WARNING_MB) {
    return {
      status: 'warning',
      message: `Memory warning: ${rssMB}MB RSS.`,
      heapMB,
      rssMB,
    };
  }

  return {
    status: 'ok',
    message: `Memory normal: ${rssMB}MB RSS.`,
    heapMB,
    rssMB,
  };
}

/**
 * Get runtime stats for an identity.
 */
export function getRuntimeStats(identity) {
  const tracker = getIdentityTracker(identity);
  const now = Date.now();

  return {
    activeExecutions: tracker.active.size,
    recentExecutions: tracker.history.filter(
      h => now - h.startedAt < RUNTIME_CONFIG.EXECUTION_WINDOW_MS
    ).length,
    memory: checkMemoryPressure(),
  };
}

/**
 * Periodic cleanup of stale trackers.
 */
function cleanupTrackers() {
  const now = Date.now();
  for (const [identity, tracker] of executionTracker) {
    // Kill any executions that have been running too long
    for (const [id, context] of tracker.active) {
      if (context.elapsedMs > RUNTIME_CONFIG.MAX_EXECUTION_TIME_MS * 2) {
        context.kill('zombie', 'Exceeded 2x deadline');
        tracker.active.delete(id);
      }
    }

    // Remove empty trackers
    if (tracker.active.size === 0 && tracker.history.length === 0) {
      executionTracker.delete(identity);
    }
  }
}

setInterval(cleanupTrackers, RUNTIME_CONFIG.CLEANUP_INTERVAL_MS);
