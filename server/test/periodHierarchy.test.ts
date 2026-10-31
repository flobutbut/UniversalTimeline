// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { changePeriodParent } from '../src/services/periodHierarchy';
import { runInTransaction } from '../src/api/transaction';

it('serializes crossed moves so only one commits (in-memory lock simulation)', async () => {
  const parents = new Map<string, string | null>([['a', null], ['b', null]]);
  let lockTail = Promise.resolve();
  const connections: any[] = [];
  const provider = {
    async connect() {
      let unlock: (() => void) | undefined;
      const client = { release: vi.fn(), query: vi.fn(async (sql: string, params?: any[]) => {
        if (sql.startsWith('LOCK TABLE')) {
          const previous = lockTail;
          lockTail = new Promise<void>(resolve => { unlock = resolve; });
          await previous;
        } else if (sql === 'COMMIT' || sql === 'ROLLBACK') {
          unlock?.();
        } else if (sql.startsWith('SELECT id FROM')) {
          return { rows: parents.has(params![0]) ? [{ id: params![0] }] : [] };
        } else if (sql.includes('WITH RECURSIVE')) {
          const rows: { id: string; parent_id: string | null }[] = [];
          const visited = new Set<string>();
          let id: string | null = params![0];
          while (id !== null && parents.has(id) && !visited.has(id)) {
            visited.add(id);
            const parent_id = parents.get(id)!;
            rows.push({ id, parent_id });
            id = parent_id;
          }
          return { rows };
        } else if (sql.includes('UPDATE public.periods')) {
          parents.set(params![1], params![0]);
          return { rows: [{ id: params![1], parent_id: params![0] }] };
        }
        return { rows: [] };
      }) };
      connections.push(client);
      return client as any;
    },
  };
  const results = await Promise.allSettled([
    runInTransaction(provider, client => changePeriodParent(client, 'a', 'b')),
    runInTransaction(provider, client => changePeriodParent(client, 'b', 'a')),
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
  expect(rejected.reason).toMatchObject({ status: 409 });
  expect(parents.get('a') === 'b' && parents.get('b') === 'a').toBe(false);
  const statements = connections.flatMap(client => client.query.mock.calls.map((args: any[]) => args[0]));
  expect(statements.filter(sql => sql === 'COMMIT')).toHaveLength(1);
  expect(statements.filter(sql => sql === 'ROLLBACK')).toHaveLength(1);
  connections.forEach(client => expect(client.release).toHaveBeenCalledOnce());
});
