/** Share schema verification, fail closed, and recover after a transient outage. */
export function createReadiness(check: () => Promise<unknown>, cooldownMs = 2000) {
  let ready = false;
  let pending: Promise<void> | undefined;
  let retryAt = 0;
  let failure: unknown;
  return function ensureReady(): Promise<void> {
    if (ready) return Promise.resolve();
    if (pending) return pending;
    if (Date.now() < retryAt) return Promise.reject(failure);
    pending = Promise.resolve().then(check).then(() => { ready = true; }, error => {
      failure = error;
      retryAt = Date.now() + cooldownMs;
      throw error;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}
