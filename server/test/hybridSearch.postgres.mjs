import { before, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal } from '../dist/auth/context.js';
const pool = testPool();
const tx = operation => runInTransaction(pool, async client => { await applyPrincipal(client, { userId: null, isAdmin: false }); return operation(client); });
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: { withTransaction: tx, query: (text, params) => tx(client => client.query(text, params)) } });
const { search } = await import('../dist/services/searchService.js');
before(async () => {
  await pool.query('DROP SCHEMA IF EXISTS auth CASCADE; DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS extensions CASCADE; CREATE SCHEMA public');
  for (const role of ['anon','authenticated','service_role']) await pool.query(`DO $$ BEGIN CREATE ROLE ${role} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await pool.query(authFixture.replace(/CREATE ROLE [^;]+;/g, ''));
  await pool.query(await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8'));
  await pool.query(`INSERT INTO events (id,wikidata_id,label_fr,label_en,description_fr,date) VALUES
    ('moon','Q43653','Premiers pas sur la Lune','Apollo 11','Neil Armstrong, astronaute de la mission Apollo 11.','1969-07-21'),
    ('writing','Q8192','Invention de l’écriture','Writing','Premières écritures.','A5000');
    INSERT INTO periods (id,label_fr,label_en,description_fr,start_date,end_date) VALUES
    ('cretaceous','Crétacé supérieur','Upper Cretaceous','Période géologique.','M100','M66')`);
});
after(() => pool.end());
test('finds event words in a different order, including French plural forms', async () => {
  assert.equal((await search('lune premier pas','','events')).events[0]?.id,'moon');
});
test('ignores accents in event and period searches', async () => {
  assert.equal((await search('ecriture','','events')).events[0]?.id,'writing');
  assert.equal((await search('superieur cretace','','periods')).periods[0]?.id,'cretaceous');
});
test('searches event descriptions and tolerates a spelling mistake', async () => {
  assert.equal((await search('astronaute Armstrong','','events')).events[0]?.id,'moon');
  assert.equal((await search('appolo','','events')).events[0]?.id,'moon');
});
test('resolves semantic QIDs to the existing catalogue despite a different label', async () => {
  assert.equal((await search('','','events',['Q43653'])).events[0]?.id,'moon');
});
test('binds special characters literally and does not widen a query with wildcards', async () => {
  assert.deepEqual((await search("%' OR 1=1 --",'','events')).events,[]);
});
test('keeps the reviewed table and RLS contract when enabling search extensions', async () => {
  const { schemaContract } = await import('./postgresFixture.mjs');
  assert.deepEqual(await schemaContract(pool), JSON.parse(await readFile(new URL('./fixtures/application-schema.json',import.meta.url),'utf8')));
});
