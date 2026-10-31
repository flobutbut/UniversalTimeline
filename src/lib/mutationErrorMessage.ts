/** A lost HTTP response does not tell us whether the transaction committed. Never resend automatically. */
export function mutationErrorMessage(error: unknown, fallback: string): string {
  const failure = error as { code?: string; message?: string; request?: unknown; response?: { data?: { error?: string; message?: string } } } | null;
  if (!failure?.response && (failure?.request || ['ECONNRESET', 'ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'].includes(failure?.code ?? '') || /ECONNRESET|socket hang up/i.test(failure?.message ?? ''))) {
    return 'L’enregistrement n’a pas pu être confirmé. Rechargez les données avant de réessayer pour éviter un doublon.';
  }
  return failure?.response?.data?.error || failure?.response?.data?.message || failure?.message || fallback;
}
