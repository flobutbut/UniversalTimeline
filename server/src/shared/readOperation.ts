/** Retry only transient read failures; one deadline covers requests and backoff. */
export class ReadFailure extends Error {
  constructor(message: string, readonly transient = false, readonly retryAfterMs?: number) {
    super(message);
  }
}
export function retryAfterMilliseconds(value: string | null | undefined, now = Date.now()): number | undefined {
  if (!value) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value) * 1000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : undefined;
}
export async function readOperation<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { signal?: AbortSignal; timeoutMs?: number; attempts?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const deadline = Date.now() + (options.timeoutMs ?? 30000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => controller.abort(options.signal?.reason ?? new DOMException('Lecture annulée', 'AbortError'));
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = new ReadFailure('Wikidata met trop de temps à répondre. Réessayez.');
  timer = setTimeout(() => controller.abort(timeout), options.timeoutMs ?? 30000);
  const abort = () => controller.signal.reason ?? new DOMException('Lecture annulée', 'AbortError');
  function bounded<R>(task: () => Promise<R>): Promise<R> {
    if (controller.signal.aborted) return Promise.reject(abort());
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(abort());
      controller.signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw abort();
        return task();
      }).then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', onAbort));
    });
  }
  async function pause(ms: number) {
    let delay: ReturnType<typeof setTimeout> | undefined;
    try {
      await bounded(() => new Promise<void>(resolve => { delay = setTimeout(resolve, ms); }));
    }
    finally { clearTimeout(delay); }
  }
  try {
    const attempts = Math.max(1, Math.min(3, options.attempts ?? 3));
    for (let attempt = 1; ; attempt++) {
      try { return await bounded(() => operation(controller.signal)); }
      catch (error) {
        if (controller.signal.aborted) throw abort();
        if (!(error instanceof ReadFailure) || !error.transient || attempt >= attempts) throw error;
        const delay = error.retryAfterMs ?? 1000 * attempt;
        // Do not retry earlier than Retry-After or keep a reader waiting beyond its deadline.
        if (delay >= deadline - Date.now()) throw error;
        await pause(delay);
      }
    }
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
