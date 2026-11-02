// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccessMiddleware } from '../src/auth/middleware';
import { applyPrincipal, principalContext } from '../src/auth/context';
import { authEnabled } from '../src/auth/config';
import { checkAccessSchema } from '../src/auth/preflight';
import { createApp } from '../src/app';
import express from 'express';

const alice = '00000000-0000-0000-0000-000000000001';
function response() { const res = { locals: {}, set: vi.fn(), status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res; }
async function access(header?: string, method = 'GET', user: any = { id: alice, app_metadata: {} }) {
  const verify = vi.fn().mockResolvedValue(user); const res = response(); const next = vi.fn(() => principalContext.getStore());
  await createAccessMiddleware(verify)({ get: () => header, method } as any, res as any, next);
  return { verify, res, next };
}
afterEach(() => vi.restoreAllMocks());

describe('request authentication', () => {
  it.each(['GET', 'HEAD'])('permits anonymous %s with a scoped public principal', async method => {
    const { verify, next } = await access(undefined, method);
    expect(verify).not.toHaveBeenCalled(); expect(next.mock.results[0].value).toEqual({ userId: null, isAdmin: false });
    expect(principalContext.getStore()).toBeUndefined();
  });
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('refuses anonymous %s before a handler can write', async method => {
    const { res, next } = await access(undefined, method);
    expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled();
  });
  it.each(['Basic token', 'Bearer', 'Bearer a b'])('refuses the malformed authorization %s', async header => {
    const { res, verify, next } = await access(header);
    expect(res.status).toHaveBeenCalledWith(401); expect(verify).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
  });
  it.each([null, { id: alice, is_anonymous: true }, { id: 'invalid' }])('refuses an invalid, anonymous or deleted user', async user => {
    const { next, res } = await access('Bearer token', 'POST', user);
    expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled();
  });
  it('refuses a suspended account from its next request, and accepts an expired suspension', async () => {
    const suspended = await access('Bearer token', 'GET', { id: alice, app_metadata: { role: 'admin' }, banned_until: '2126-11-02T00:00:00Z' });
    expect(suspended.res.status).toHaveBeenCalledWith(403); expect(suspended.next).not.toHaveBeenCalled();
    const lifted = await access('Bearer token', 'GET', { id: alice, app_metadata: {}, banned_until: '2020-01-01T00:00:00Z' });
    expect(lifted.next).toHaveBeenCalledOnce();
  });
  it('uses verified app_metadata, never user-editable metadata, for admin access', async () => {
    expect((await access('Bearer token', 'POST', { id: alice, user_metadata: { role: 'admin' } })).next.mock.results[0].value).toEqual({ userId: alice, isAdmin: false });
    expect((await access('Bearer token', 'POST', { id: alice, app_metadata: { role: 'admin' } })).next.mock.results[0].value).toEqual({ userId: alice, isAdmin: true });
  });
  it('does not turn an Auth outage into an invalid session or expose its details', async () => {
    const res = response(); const next = vi.fn();
    await createAccessMiddleware(async () => { throw new Error('private credentials'); })({ get: () => 'Bearer token', method: 'GET' } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(503); expect(next).not.toHaveBeenCalled();
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('private');
  });
  it('keeps concurrent users isolated across asynchronous continuations', async () => {
    const ids = [alice, '00000000-0000-0000-0000-000000000002'];
    const seen = await Promise.all(ids.map(userId => principalContext.run({ userId, isAdmin: false }, async () => {
      await Promise.resolve(); return principalContext.getStore()?.userId;
    })));
    expect(seen).toEqual(ids); expect(principalContext.getStore()).toBeUndefined();
  });
});

it('binds only a fixed role and parameterized claims to the current transaction', async () => {
  const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
  await applyPrincipal(client as any, { userId: alice, isAdmin: true });
  expect(client.query.mock.calls[0]).toEqual(['SET LOCAL ROLE authenticated']);
  const [sql, params] = client.query.mock.calls[1]; expect(sql).toContain("set_config('request.jwt.claims', $1, true)");
  expect(JSON.parse(params[0])).toEqual({ sub: alice, role: 'authenticated', app_metadata: { role: 'admin' } });
  await applyPrincipal(client as any, { userId: null, isAdmin: false });
  expect(client.query.mock.calls[2]).toEqual(['SET LOCAL ROLE anon']);
});
it('keeps access off until explicitly enabled, rejecting misspelled flags', () => {
  expect(authEnabled({})).toBe(false); expect(authEnabled({ AUTH_ENABLED: 'false' })).toBe(false);
  expect(authEnabled({ AUTH_ENABLED: 'true' })).toBe(true); expect(() => authEnabled({ AUTH_ENABLED: 'yes' })).toThrow('true ou false');
});
it.each([undefined, 'false'])('refuses production startup with AUTH_ENABLED=%s', value => {
  expect(() => authEnabled({ NODE_ENV: 'production', AUTH_ENABLED: value })).toThrow('requis en production');
});
it('allows production only with explicit authentication enabled', () => {
  expect(authEnabled({ NODE_ENV: 'production', AUTH_ENABLED: 'true' })).toBe(true);
});
it('refuses activation on a missing or partial migration', async () => {
  const client = { query: vi.fn() };
  for (const row of [undefined, { version: 'old', policies: 21, restricted_roles: true }, { version: 'UniversalTimeline access v1;', policies: 20, restricted_roles: true }, { version: 'UniversalTimeline access v1;', policies: 21, restricted_roles: false }]) {
    client.query.mockResolvedValue({ rows: row ? [{ ...row, tables_guarded: true }] : [] });
    await expect(checkAccessSchema(client as any)).rejects.toThrow('Migration');
  }
  client.query.mockResolvedValue({ rows: [{ version: 'UniversalTimeline access v1;', policies: 21, restricted_roles: true, tables_guarded: false }] });
  await expect(checkAccessSchema(client as any)).rejects.toThrow('Migration');
  client.query.mockResolvedValue({ rows: [{ version: 'UniversalTimeline access v1;', policies: 21, restricted_roles: true, tables_guarded: true }] });
  await expect(checkAccessSchema(client as any)).resolves.toBeUndefined();
});

it('reports access mode publicly but exposes account identity only after verification', () => {
  const app = createApp({ routes:express.Router(), healthcheck:vi.fn(), isStopping:()=>false, access:createAccessMiddleware(vi.fn()) });
  const route = (path:string) => app._router.stack.find((entry:any)=>entry.route?.path===path).route.stack[0].handle;
  const publicRes = response(); route('/api/access')({},publicRes);
  expect(publicRes.json).toHaveBeenCalledWith({enabled:true});
  const anonymous = response(); route('/api/account')({},anonymous);
  expect(anonymous.status).toHaveBeenCalledWith(401);
  const verified = response(); verified.locals = { principal:{userId:alice,isAdmin:true} };
  route('/api/account')({},verified);
  expect(verified.json).toHaveBeenCalledWith({id:alice,isAdmin:true});
  expect(verified.set).toHaveBeenCalledWith('Cache-Control','no-store');
});
