// Cursor pagination, filters and public visibility on a disposable local PostgreSQL only.
import { before, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';
const pool = testPool();
const tx = operation => runInTransaction(pool, async db => {
  await applyPrincipal(db, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(db);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: { withTransaction: tx } });
const { listPublicStoryCatalogue } = await import('../dist/services/storyCatalogueService.js');
const { parseStoryCatalogueInput } = await import('../dist/api/storyCatalogueInput.js');
const page = (query = {}, userId = null) => principalContext.run({ userId, isAdmin: false }, () => listPublicStoryCatalogue(parseStoryCatalogueInput(query)));

before(async () => {
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8'));
  await pool.query(`
    INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
      ('${alice}','alice@example.test',now(),'{"username":"Alice"}'),('${bob}','bob@example.test',now(),'{"username":"Bob"}');
    INSERT INTO stories(id,title_fr,title_en,author,is_public,owner_user_id) OVERRIDING SYSTEM VALUE
      SELECT n, 'Frise ' || n, '', 'Alice', true, '${alice}'::uuid FROM generate_series(1,2500) n;
    INSERT INTO stories(id,title_fr,title_en,author,is_public,owner_user_id) OVERRIDING SYSTEM VALUE VALUES
      (3001,'SECRET BOB','Secret Bob','Bob',false,'${bob}'),(3002,'SECRET ALICE','Secret Alice','Alice',false,'${alice}');
    INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES
      ('modern','Moderne','Modern','1900','2000'),('deep','Profonde','Deep time','G4.5','G4.0'),('unknown','Inconnue','Unknown','inconnue','inconnue');
    INSERT INTO story_periods(story_id,period_id) SELECT n,'modern' FROM generate_series(1,2500) n;
    DELETE FROM story_periods WHERE story_id IN (3,4);
    INSERT INTO story_periods(story_id,period_id) VALUES (3,'unknown'),(4,'deep');
    INSERT INTO events(id,label_fr,label_en,date) SELECT 'event-' || n, 'Événement ' || n, 'Event ' || n, (1950+n)::text FROM generate_series(1,30) n;
    INSERT INTO story_events(story_id,event_id) SELECT 2500,id FROM events;
    INSERT INTO story_tags(story_id,tag_id,position) VALUES (1,'sciences-savoirs',1),(3001,'sport',1),(3002,'sport',1);
    UPDATE stories SET title_fr='Carrière de Marie Curie',description_fr='Découvertes et radioactivité' WHERE id=1;
  `);
});
after(() => pool.end());

test('loads 24 of 2500 public frises, bounds the previews, and finds facets beyond the first page', async () => {
  const result = await page();
  assert.equal(result.items.length, 24);
  assert.equal(result.items[0].id, 2500);
  assert.equal(result.nextCursor, '2477');
  assert.equal(result.total, 2500);
  assert.equal(result.publicTotal, 2500);
  assert.equal(result.items[0].preview_events.length, 12);
  assert.equal(result.items[0].start_date, '1900');
  assert.equal(result.items[0].end_date, '2000');
  assert.ok(result.tags.some(tag => tag.id === 'sciences-savoirs'));
  assert.ok(!result.tags.some(tag => tag.id === 'sport'));
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  const owner = await page({}, alice);
  assert.equal(owner.publicTotal, 2500);
  assert.ok(!JSON.stringify(owner).includes('SECRET'));
});

test('does not repeat or skip existing frises when a higher ID is inserted and a row is deleted', async () => {
  const first = await page();
  await pool.query(`INSERT INTO stories(id,title_fr,title_en,author,is_public,owner_user_id) OVERRIDING SYSTEM VALUE VALUES (3000,'Nouvelle frise','New story','Alice',true,'${alice}')`);
  await pool.query('DELETE FROM stories WHERE id=2476');
  const second = await page({ cursor: first.nextCursor });
  assert.equal(second.items[0].id, 2475);
  assert.equal(second.items.length, 24);
  assert.ok(!second.items.some(item => first.items.some(previous => previous.id === item.id)));
  assert.ok(!second.items.some(item => item.id === 3000));
  assert.equal((await page()).items[0].id, 3000);
});

test('searches and filters all public frises rather than only the loaded pages', async () => {
  const result = await page({ q: 'decouvertes Curie', tags: 'sciences-savoirs' });
  assert.deepEqual(result.items.map(item => item.id), [1]);
  assert.equal(result.total, 1);
  assert.equal(result.nextCursor, null);
  assert.equal((await page({ q: "' OR 1=1 --" })).items.length, 0);
  assert.equal((await page({ tags: 'sport' }, alice)).items.length, 0);
});

test('date filters retain the shared parsing rules, including deep time and unknown bounds', async () => {
  const deep = await page({ timeOld: '5000000000', timeRecent: '4000000000' });
  assert.deepEqual(deep.items.map(item => item.id), [4]);
  assert.equal(deep.total, null);
  assert.equal(deep.nextCursor, null);
  const recent = await page({ cursor: '6', timeOld: '200', timeRecent: '0', periodOld: '100', periodRecent: '0' });
  assert.deepEqual(recent.items.map(item => item.id), [5,2,1]);
  assert.equal(recent.nextCursor, null);
});
