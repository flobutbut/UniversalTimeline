const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_DELAY_MS = 1000;

/** Exécute une opération async avec jusqu’à N tentatives et pause fixe entre échecs (ex. 429 Wikidata). */
export async function retryAsyncOperation<T>(
  operation: () => Promise<T>,
  options?: { maxRetries?: number; delayMs?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error('retryAsyncOperation: exhausted without error');
}
