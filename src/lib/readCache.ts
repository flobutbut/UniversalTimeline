/** Public read-only data. Never use this cache for account-scoped application data. */
export function createReadCache<T>(options: { maxEntries: number; maxPending?: number; ttlMs: number; copy: (value: T) => T }) {
  interface Entry {
    controller: AbortController;
    promise: Promise<T>;
    readers: number;
  }
  const values = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, Entry>();
  const aborted = () => new DOMException('Lecture annulée', 'AbortError');

  function read(
    key: string,
    load: (signal: AbortSignal) => Promise<T>,
    request: { signal?: AbortSignal; force?: boolean; ttlMs?: number } = {},
  ): Promise<T> {
    const { signal } = request;
    if (signal?.aborted) return Promise.reject(aborted());
    if (request.force) values.delete(key);
    const cached = values.get(key);
    if (cached && cached.expires > Date.now()) {
      values.delete(key);
      values.set(key, cached);
      return Promise.resolve(options.copy(cached.value));
    }
    values.delete(key);
    let entry = pending.get(key);
    if (!entry) {
      if (pending.size >= (options.maxPending ?? 32)) return Promise.reject(new Error('Trop de lectures simultanées. Réessayez.'));
      const controller = new AbortController();
      const created: Entry = {
        controller,
        readers: 0,
        promise: Promise.resolve().then(() => {
          if (controller.signal.aborted) throw aborted();
          return load(controller.signal);
        }).then(value => {
          if (controller.signal.aborted || pending.get(key) !== created) throw aborted();
          values.set(key, {
            value: options.copy(value),
            expires: Date.now() + (request.ttlMs ?? options.ttlMs),
          });
          while (values.size > options.maxEntries) values.delete(values.keys().next().value!);
          return value;
        }).finally(() => {
          if (pending.get(key) === created) pending.delete(key);
        }),
      };
      pending.set(key, created);
      entry = created;
    }
    const shared = entry;
    shared.readers++;
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      function finish(operation: () => void) {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', cancel);
        shared.controller.signal.removeEventListener('abort', cancel);
        shared.readers--;
        if (shared.readers === 0 && pending.get(key) === shared) {
          pending.delete(key);
          shared.controller.abort();
        }
        operation();
      }
      function cancel() { finish(() => reject(aborted())); }
      signal?.addEventListener('abort', cancel, { once: true });
      shared.controller.signal.addEventListener('abort', cancel, { once: true });
      shared.promise.then(
        value => finish(() => {
          try { resolve(options.copy(value)); }
          catch (error) { reject(error); }
        }),
        error => finish(() => reject(error)),
      );
    });
  }
  function clear() {
    values.clear();
    const entries = [...pending.values()];
    pending.clear();
    for (const entry of entries) entry.controller.abort();
  }
  return { read, clear };
}
