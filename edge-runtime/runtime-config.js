export const DEFAULT_RUNTIME_CONFIG = {
  appsRoot: 'apps',
  maxRequestBytes: 64 * 1024,
  maxExecutionMs: 75,
  maxWorkerMemoryMb: 64,
  workerCount: 3,
  cacheTtlMs: 60_000,
  staticCacheTtlMs: 300_000,
  maxAppCodeBytes: 256 * 1024
};

export function withRuntimeConfig(overrides = {}) {
  return { ...DEFAULT_RUNTIME_CONFIG, ...overrides };
}
