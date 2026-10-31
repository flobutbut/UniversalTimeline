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
  const pending = new Map<string, Promise<void>>();
  const revisions = new Map<string, number>();
  let epoch = 0;

  async function load<T>(key: string, fetch: () => Promise<T>, apply: (value: T) => void, force = false): Promise<void> {
    const shared = pending.get(key);
    if (shared) return shared;
    if (!force && loaded.has(key)) return;
    const version = revisions.get(key) ?? 0;
    const startedEpoch = epoch;
    const isCurrent = () => startedEpoch === epoch && version === (revisions.get(key) ?? 0);
    onStatus(key, { loading: true, error: null });

    // Defer fetch until the promise is registered, including synchronous failures.
    const request = Promise.resolve().then(fetch).then(async value => {
      if (startedEpoch !== epoch) throw new SupersededRequestError();
      if (!isCurrent()) return load(key, fetch, apply);
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
      // A mutation invalidates both successful and failed older responses.
      if (!isCurrent()) return load(key, fetch, apply);
      onStatus(key, { loading: false, error: cause instanceof Error ? cause.message : 'Erreur de chargement' });
      throw cause;
    }).finally(() => {
      if (pending.get(key) === request) pending.delete(key);
    });
    pending.set(key, request);
    return request;
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
    pending.clear();
    revisions.clear();
  }

  return { load, invalidate, invalidateMatching, clear };
}
