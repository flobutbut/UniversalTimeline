import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture } from './postgresFixture.mjs';

const pool = testPool();
const migration = await readFile(new URL('../../database/migrations/20261104234615_wikidata_fact_sources.sql', import.meta.url), 'utf8');
before(async () => {
  await pool.query(authFixture);
  const baseline = await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8');
  await pool.query(baseline.slice(0, baseline.indexOf('-- Public Wikidata provenance.')));
  await pool.query("INSERT INTO events(id,wikidata_id,label_fr,label_en,date) VALUES('existing-event','Q1','Conservé','Preserved','1900'); INSERT INTO periods(id,wikidata_id,label_fr,label_en,start_date,end_date) VALUES('existing-period','Q2','Ancien','Existing','1800','1900')");
});
after(() => pool.end());
test('adds source identities to an existing catalogue without changing its records or policies', async () => {
  const rows = async () => (await pool.query("SELECT to_jsonb(e)-'source_key'-'wikidata_source' data FROM events e UNION ALL SELECT to_jsonb(p)-'source_key'-'wikidata_source' FROM periods p")).rows;
  const policies = async () => (await pool.query("SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows;
  const beforeRows = await rows(), beforePolicies = await policies();
  await pool.query(migration);
  assert.deepEqual(await rows(), beforeRows);
  assert.deepEqual(await policies(), beforePolicies);
  const indexes = (await pool.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname IN ('periods_source_key_unique','events_source_key_unique')")).rows;
  assert.equal(indexes.length, 2); assert.ok(indexes.every(index => index.indexdef.includes('WHERE (source_key IS NOT NULL)')));
  await assert.rejects(pool.query("INSERT INTO events(id,label_fr,label_en,source_key) VALUES('invalid','Invalide','Invalid','fact:Q1:P569:q1$invalid')"), { code: '23514' });
});
