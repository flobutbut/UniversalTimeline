export class SupersededRequestError extends Error {
  constructor() {
    super('Chargement annulé après réinitialisation des données');
    this.name = 'SupersededRequestError';
  }
}

export interface RequestStatus {
  loading: boolean;
  error: string | null;
}

/** Shares reads, including empty results. Only the current request may publish. */
export function createRequestCache(onStatus: (key: string, status: RequestStatus) => void) {
  const loaded = new Set<string>();
  interface Pending { promise: Promise<void>; controller: AbortController; readers: number; settled: boolean }
  const pending = new Map<string, Pending>();
  const revisions = new Map<string, number>();
  let epoch = 0;

  function join(entry: Pending, signal?: AbortSignal): Promise<void> {
    entry.readers++;
    return new Promise<void>((resolve, reject) => {
      let done = false;
      const finish = (action: () => void) => {
        if (done) return;
        done = true; signal?.removeEventListener('abort', cancel); entry.readers--;
        if (!entry.readers && !entry.settled) entry.controller.abort();
        action();
      };
      const cancel = () => finish(() => reject(new DOMException('Lecture annulée', 'AbortError')));
      signal?.addEventListener('abort', cancel, { once: true });
      entry.promise.then(() => finish(resolve), error => finish(() => reject(error)));
      if (signal?.aborted) cancel();
    });
  }

  async function load<T>(key: string, fetch: (signal: AbortSignal) => Promise<T>, apply: (value: T) => void, force = false, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    const shared = pending.get(key);
    if (shared && !shared.controller.signal.aborted) return join(shared, signal);
    if (!force && loaded.has(key)) return;
    const version = revisions.get(key) ?? 0;
    const startedEpoch = epoch;
    const isCurrent = () => startedEpoch === epoch && version === (revisions.get(key) ?? 0);
    onStatus(key, { loading: true, error: null });
    const controller = new AbortController();
    const entry: Pending = { promise: undefined!, controller, readers: 0, settled: false };

    // Defer fetch until the promise is registered, including synchronous failures.
    const request = Promise.resolve().then(() => { controller.signal.throwIfAborted(); return fetch(controller.signal); }).then(async value => {
      if (startedEpoch !== epoch) throw new SupersededRequestError();
      controller.signal.throwIfAborted();
      if (!isCurrent()) return load(key, fetch, apply, false, controller.signal);
      try {
        apply(value);
      } catch (cause) {
        onStatus(key, { loading: false, error: cause instanceof Error ? cause.message : 'Erreur de chargement' });
        throw cause;
      }
      loaded.add(key);
      onStatus(key, { loading: false, error: null });
    }, async cause => {
      if (startedEpoch !== epoch) throw new SupersededRequestError();
      controller.signal.throwIfAborted();
      // A mutation invalidates both successful and failed older responses.
      if (!isCurrent()) return load(key, fetch, apply, false, controller.signal);
      onStatus(key, { loading: false, error: cause instanceof Error ? cause.message : 'Erreur de chargement' });
      throw cause;
    }).finally(() => {
      entry.settled = true;
      if (pending.get(key) === entry) {
        pending.delete(key);
        if (controller.signal.aborted) onStatus(key, { loading: false, error: null });
      }
    });
    entry.promise = request;
    pending.set(key, entry);
    return join(entry, signal);
  }

  function invalidate(key: string) {
    revisions.set(key, (revisions.get(key) ?? 0) + 1);
    loaded.delete(key);
    pending.delete(key);
    onStatus(key, { loading: false, error: null });
  }

  function invalidateMatching(matches: (key: string) => boolean) {
    for (const key of new Set([...loaded, ...pending.keys(), ...revisions.keys()])) {
      if (matches(key)) invalidate(key);
    }
  }

  function clear() {
    epoch++;
    loaded.clear();
    for (const entry of pending.values()) entry.controller.abort();
    pending.clear();
    revisions.clear();
  }

  return { load, invalidate, invalidateMatching, clear };
}
