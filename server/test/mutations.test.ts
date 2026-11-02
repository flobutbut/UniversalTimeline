// @vitest-environment node
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { withTransaction, query } from '../src/api/database';
import { runInTransaction } from '../src/api/transaction';
import router from '../src/api/routes';

// No pool is constructed, no environment file is read, and no network is used.
vi.mock('../src/api/database', () => ({ withTransaction: vi.fn(), query: vi.fn() }));

const client = { query: vi.fn(), release: vi.fn() };
const provider = { connect: vi.fn().mockResolvedValue(client) };

function response() {
  const res = { status: vi.fn(), json: vi.fn(), send: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  return res;
}

async function call(method: string, path: string, body: Record<string, unknown> = {}) {
  // Invoke the actual Express route handler without binding a port.
  const layer = router.stack.find((entry: any) => entry.route?.path === path && entry.route.methods[method]);
  if (!layer) throw new Error(`Missing handler: ${method} ${path}`);
  const res = response();
  await layer.route.stack[0].handle({ params: { id: path.startsWith('/stories') ? '1' : 'entity-1' }, body }, res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  provider.connect.mockResolvedValue(client);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  client.query.mockImplementation(async (sql: string) => {
    if (/RETURNING/.test(sql)) return { rows: [{ id: 'entity-1' }] };
    return { rows: [] };
  });
  vi.mocked(withTransaction).mockImplementation(operation => runInTransaction(provider, operation));
  vi.mocked(query).mockImplementation(async () => { throw new Error('Pool queries are forbidden in mutations under test'); });
});
afterEach(() => vi.restoreAllMocks());

for (const entity of ['events', 'periods', 'stories']) {
  const body = { label: { fr: 'Label' }, title: { fr: 'Frise' }, author: 'Author', wikidata_id: 'Q123', date: 'M65', start_date: 'M65', end_date: 'NOW' };
  describe(`PUT /${entity}/:id`, () => {
    it('clears all categories for an explicit empty array and commits afterwards', async () => {
      const res = await call('put', `/${entity}/:id`, { ...body, categories: [] });
      const sql = client.query.mock.calls.map(args => args[0] as string);
      expect(sql[0]).toBe('BEGIN');
      expect(sql[1]).toMatch(new RegExp(`UPDATE public.${entity}`));
      expect(sql[2]).toMatch(/DELETE FROM public\.\w+_categories/);
      expect(sql[3]).toMatch(/SELECT c.id/);
      expect(sql[4]).toBe('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ id: 'entity-1', categories: [] });
      expect(query).not.toHaveBeenCalled();
      expect(client.release).toHaveBeenCalledOnce();
    });

    it('preserves associations when the categories field is absent', async () => {
      await call('put', `/${entity}/:id`, body);
      const sql = client.query.mock.calls.map(args => args[0] as string);
      expect(sql).toHaveLength(4);
      expect(sql.some(statement => /^(DELETE|INSERT).*_categories/.test(statement))).toBe(false);
      expect(sql[2]).toMatch(/SELECT c.id/);
      expect(sql[3]).toBe('COMMIT');
    });

    it.each([null, 'invalid', [{}], [{ id: '' }]])('rejects malformed categories before any write (%j)', async categories => {
      const res = await call('put', `/${entity}/:id`, { ...body, categories });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(withTransaction).not.toHaveBeenCalled();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('deduplicates category IDs and keeps all IDs parameterized', async () => {
      await call('put', `/${entity}/:id`, { ...body, categories: [{ id: 'cat-1' }, { id: 'cat-1' }, { id: 'cat-2' }] });
      const insert = client.query.mock.calls.find(args => /^INSERT INTO public/.test(args[0]));
      expect(insert?.[1]).toEqual([entity === 'stories' ? '1' : 'entity-1', 'cat-1', 'cat-2']);
      expect(insert?.[0]).not.toContain('cat-1');
    });

    it('rolls back both entity and association updates on a failed category insert', async () => {
      client.query.mockImplementation(async (sql: string) => {
        if (/^INSERT INTO public/.test(sql)) throw new Error('category foreign key violation');
        return { rows: /RETURNING/.test(sql) ? [{ id: 'entity-1' }] : [] };
      });
      const res = await call('put', `/${entity}/:id`, { ...body, categories: [{ id: 'missing-category' }] });
      const sql = client.query.mock.calls.map(args => args[0] as string);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(sql.at(-1)).toBe('ROLLBACK');
      expect(sql).not.toContain('COMMIT');
      expect(client.release).toHaveBeenCalledOnce();
    });

    it('does not delete any associations when the entity does not exist', async () => {
      client.query.mockResolvedValue({ rows: [] });
      const res = await call('put', `/${entity}/:id`, { ...body, categories: [] });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(client.query.mock.calls.some(args => /^DELETE/.test(args[0]))).toBe(false);
    });
  });
}

it('rolls back event creation if linking categories fails', async () => {
  client.query.mockImplementation(async (sql: string) => {
    if (/INSERT INTO public.event_categories/.test(sql)) throw new Error('invalid category');
    return { rows: /RETURNING/.test(sql) ? [{ id: 'entity-1' }] : [] };
  });
  const res = await call('post', '/events', { id: 'entity-1', label: { fr: 'Event' }, date: 'M65', categories: [{ id: 'bad' }] });
  expect(res.status).toHaveBeenCalledWith(500);
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  expect(client.query.mock.calls.some(args => args[0] === 'COMMIT')).toBe(false);
});

for (const entity of ['events', 'stories']) {
  it(`rolls back deleted links if DELETE /${entity}/:id is refused by a constraint`, async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes(`DELETE FROM public.${entity} WHERE`)) throw new Error('entity is still referenced');
      return { rows: [] };
    });
    const res = await call('delete', `/${entity}/:id`);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(client.query.mock.calls.some(args => args[0] === 'COMMIT')).toBe(false);
    expect(query).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledOnce();
  });
}

it('retires the global parent endpoint without opening a transaction', async () => {
  const res = await call('patch', '/periods/:id/parent', { parent_id: 'parent' });
  expect(res.status).toHaveBeenCalledWith(410); expect(withTransaction).not.toHaveBeenCalled();
});
it('refuses a global parent in a shared period metadata write', async () => {
  const res = await call('post', '/periods', {id:'new',wikidata_id:'Q123',label:{fr:'Fiche'},start_date:'M65',parent_id:'parent'});
  expect(res.status).toHaveBeenCalledWith(400); expect(withTransaction).not.toHaveBeenCalled();
});

it.each(['periods', 'events'])('returns 409 and rolls back a concurrent duplicate during PUT /%s/:id', async entity => {
  client.query.mockImplementation(async (sql: string) => {
    if (sql.includes('UPDATE public.')) throw Object.assign(new Error('duplicate'), { code: '23505' });
    return { rows: [] };
  });
  const res = await call('put', `/${entity}/:id`, { label: { fr: 'Label' }, wikidata_id: 'Q123', date: 'M65', start_date: 'M65', categories: [] });
  expect(res.status).toHaveBeenCalledWith(409);
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  expect(client.query.mock.calls.some(args => args[0].includes('DELETE'))).toBe(false);
});

it('returns 409 when period creation races with another creation', async () => {
  client.query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO public.periods')) throw Object.assign(new Error('duplicate'), { code: '23505' });
    return { rows: [] };
  });
  const res = await call('post', '/periods', { id: 'new', wikidata_id: 'Q123', label: { fr: 'Label' }, start_date: 'M65' });
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.status).not.toHaveBeenCalledWith(201);
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
});

describe('DELETE /periods/:id', () => {
  beforeEach(() => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT id FROM public.periods')) return { rows: [{ id: 'entity-1', parent_id: 'parent' }] };
      if (sql.includes('AS children')) return { rows: [{ children: 0, stories: 0 }] };
      if (sql.includes('AS has_children')) return { rows: [{ has_children: false }] };
      return { rows: [] };
    });
  });

  it('locks before checking dependencies, deletes only the period links and commits before success', async () => {
    const res = await call('delete', '/periods/:id');
    const sql = client.query.mock.calls.map(args => args[0]);
    expect(sql[0]).toBe('BEGIN');
    expect(sql[1]).toContain('lock_timeout');
    expect(sql[2]).toContain('FOR UPDATE');
    expect(sql[4]).toBe('DELETE FROM public.period_categories WHERE period_id = $1');
    expect(sql[5]).toBe('DELETE FROM public.periods WHERE id = $1');
    expect(sql.at(-1)).toBe('COMMIT');
    expect(client.query.mock.calls[4][1]).toEqual(['entity-1']);
    expect(query).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 'entity-1', parent: null });
    expect(client.release).toHaveBeenCalledOnce();
  });

  it.each([{ children: 1, stories: 0 }, { children: 0, stories: 1 }, { children: 2, stories: 3 }])('refuses dependencies without deleting links (%j)', async dependencies => {
    const previous = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: string, ...args: any[]) => sql.includes('AS children') ? { rows: [dependencies] } : previous(sql, ...args));
    const res = await call('delete', '/periods/:id');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('Suppression impossible') });
    expect(client.query.mock.calls.some(args => args[0].startsWith('DELETE'))).toBe(false);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });

  it('returns 404 for a missing period without touching associations', async () => {
    client.query.mockResolvedValue({ rows: [] });
    const res = await call('delete', '/periods/:id');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(client.query.mock.calls.some(args => args[0].startsWith('DELETE'))).toBe(false);
  });

  it.each(['period_categories', 'DELETE FROM public.periods', 'AS children'])('rolls back the entire delete if %s fails', async failing => {
    const previous = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: string, ...args: any[]) => {
      if (sql.includes(failing)) throw new Error('Private SQL detail');
      return previous(sql, ...args);
    });
    const res = await call('delete', '/periods/:id');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erreur lors de la suppression de la période' });
    expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(client.query.mock.calls.some(args => args[0] === 'COMMIT')).toBe(false);
  });

  it.each([['55P03', 503], ['40P01', 503], ['23503', 409]] as const)('maps database code %s to HTTP %s after rollback', async (code, status) => {
    const previous = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: string, ...args: any[]) => {
      if (sql.startsWith('DELETE FROM public.periods')) throw Object.assign(new Error('Private SQL detail'), { code });
      return previous(sql, ...args);
    });
    const res = await call('delete', '/periods/:id');
    expect(res.status).toHaveBeenCalledWith(status);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });

  it('returns a null parent for a deleted root', async () => {
    const previous = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: string, ...args: any[]) => sql.startsWith('SELECT id FROM public.periods') ? { rows: [{ id: 'entity-1', parent_id: null }] } : previous(sql, ...args));
    const res = await call('delete', '/periods/:id');
    expect(res.json).toHaveBeenCalledWith({ id: 'entity-1', parent: null });
    expect(client.query.mock.calls.some(args => args[0].includes('AS has_children'))).toBe(false);
  });
});


it('returns 201 only after event and categories have committed', async () => {
  const res = await call('post', '/events', { id: 'entity-1', label: { fr: 'Event' }, date: 'M65', categories: [{ id: 'cat-1' }] });
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ id: 'entity-1', categories: [] });
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
});

for (const entity of ['events', 'stories']) {
  it(`commits a successful DELETE /${entity}/:id before returning 204`, async () => {
    const res = await call('delete', `/${entity}/:id`);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });
}
