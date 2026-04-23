import vm from 'vm';
import { isMainThread, parentPort } from 'worker_threads';

function buildSandboxContext(request) {
  const ctx = vm.createContext({
    console: Object.freeze({
      log: (...args) => console.log('[EdgeApp]', ...args),
      warn: (...args) => console.warn('[EdgeApp]', ...args),
      error: (...args) => console.error('[EdgeApp]', ...args)
    }),
    URL,
    TextEncoder,
    TextDecoder,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    fetch: undefined,
    require: undefined,
    process: undefined,
    Buffer: undefined,
    request: Object.freeze({ ...request }),
    Response: class Response {
      constructor(body = '', init = {}) {
        this.body = typeof body === 'string' ? body : JSON.stringify(body);
        this.status = init.status || 200;
        this.headers = init.headers || { 'content-type': 'text/plain; charset=utf-8' };
      }
    }
  });

  ctx.globalThis = ctx;
  return ctx;
}

export function createSandbox({ code, request, timeoutMs }) {
  const context = buildSandboxContext(request);
  const script = new vm.Script(`${code}\n;globalThis.__edgeHandler = globalThis.handleRequest || globalThis.default || null;`, {
    filename: 'app.js'
  });

  return {
    async run() {
      script.runInContext(context, { timeout: timeoutMs });
      const handler = context.__edgeHandler;
      if (typeof handler !== 'function') {throw new Error('app-missing-handleRequest');}
      const result = await Promise.resolve(handler(context.request));
      if (result && typeof result === 'object' && 'status' in result && 'body' in result) {return result;}
      return { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(result ?? {}) };
    }
  };
}

if (!isMainThread && parentPort) {
  parentPort.on('message', async (job) => {
    try {
      const sandbox = createSandbox({ code: job.code, request: job.request, timeoutMs: job.timeoutMs });
      const response = await sandbox.run();
      parentPort.postMessage({ id: job.id, ok: true, response });
    } catch (error) {
      parentPort.postMessage({ id: job.id, ok: false, error: error?.message || 'sandbox-execution-failed' });
    }
  });
}
