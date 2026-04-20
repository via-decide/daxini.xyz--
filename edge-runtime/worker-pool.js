import { Worker } from 'worker_threads';

export class WorkerPool {
  constructor({ size, memoryMb, timeoutMs }) {
    this.size = Math.max(1, size || 1);
    this.memoryMb = memoryMb;
    this.timeoutMs = timeoutMs;
    this.workers = [];
    this.queue = [];
    this.nextId = 1;

    for (let i = 0; i < this.size; i += 1) this.workers.push(this.#createWorker(i));
  }

  #spawnWorker(state) {
    const worker = new Worker(new URL('./sandbox.js', import.meta.url), {
      resourceLimits: { maxOldGenerationSizeMb: this.memoryMb }
    });

    worker.on('message', (msg) => {
      const record = state.jobs.get(msg.id);
      if (!record) return;
      clearTimeout(record.timer);
      state.jobs.delete(msg.id);
      state.busy = false;
      msg.ok ? record.resolve(msg.response) : record.reject(new Error(msg.error));
      this.#drain();
    });

    worker.on('error', async () => {
      state.busy = false;
      for (const [, record] of state.jobs) {
        clearTimeout(record.timer);
        record.reject(new Error('worker-crashed'));
      }
      state.jobs.clear();
      try { await worker.terminate(); } catch {}
      state.worker = this.#spawnWorker(state);
      this.#drain();
    });

    return worker;
  }

  #createWorker(slot) {
    const state = { slot, busy: false, jobs: new Map(), worker: null };
    state.worker = this.#spawnWorker(state);
    return state;
  }

  execute({ code, request }) {
    return new Promise((resolve, reject) => {
      this.queue.push({ code, request, resolve, reject });
      this.#drain();
    });
  }

  #drain() {
    const idle = this.workers.find((w) => !w.busy);
    if (!idle || this.queue.length === 0) return;

    const job = this.queue.shift();
    const id = this.nextId++;
    idle.busy = true;

    const timer = setTimeout(async () => {
      idle.jobs.delete(id);
      idle.busy = false;
      try { await idle.worker.terminate(); } catch {}
      idle.worker = this.#spawnWorker(idle);
      job.reject(new Error('execution-timeout'));
      this.#drain();
    }, this.timeoutMs);

    idle.jobs.set(id, { resolve: job.resolve, reject: job.reject, timer });
    idle.worker.postMessage({ id, code: job.code, request: job.request, timeoutMs: this.timeoutMs });
  }

  async close() {
    await Promise.all(this.workers.map((w) => w.worker.terminate()));
  }
}
