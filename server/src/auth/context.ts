import { AsyncLocalStorage } from 'node:async_hooks';
import type { TransactionClient } from '../api/transaction.js';

export interface Principal { userId: string | null; isAdmin: boolean }
export const principalContext = new AsyncLocalStorage<Principal>();

/** A transaction-local role and claims cannot leak to the next pool borrower. */
export async function applyPrincipal(client: TransactionClient, principal: Principal): Promise<void> {
  await client.query(principal.userId ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon');
  await client.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({
    sub: principal.userId, role: principal.userId ? 'authenticated' : 'anon',
    app_metadata: { role: principal.isAdmin ? 'admin' : 'user' },
  })]);
}
