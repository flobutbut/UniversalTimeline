import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const { Client } = require('pg');
require('dotenv').config({ path: new URL('../../server/.env', import.meta.url), quiet: true });
const { createDatabaseConfig } = await import('../../server/src/config/database.ts');
const { findStorySnapshot, listStories } = await import('../../server/src/repositories/storyRepository.ts');
const statements = [];
const capture = { async query(text, params) { statements.push({ text, params }); return { rows: [] }; } };
await listStories(capture);
await findStorySnapshot(capture, '1');
await findStorySnapshot(capture, '51');
const client = new Client({ ...createDatabaseConfig(), application_name: 'universal-timeline-performance-audit' });
const results = [];
try {
  await client.connect();
  for (const role of ['anon', 'authenticated']) {
    for (let i=0; i<statements.length; i++) {
      await client.query('BEGIN READ ONLY');
      try {
        await client.query("SET LOCAL statement_timeout='12s'");
        await client.query(`SET LOCAL ROLE ${role}`);
        // Synthetic identity with public-read rights only. No real account is impersonated.
        await client.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({sub:role === 'anon' ? null:'00000000-0000-4000-8000-000000000000',role,app_metadata:{role:'user'}})]);
        const t = performance.now();
        const result = await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + statements[i].text, statements[i].params);
        const plan=result.rows[0]['QUERY PLAN'][0];
        const row={role,operation:i===0?'list':'snapshot',storyId:statements[i].params?.[0]??null,wallMs:Math.round(performance.now()-t),planningMs:plan['Planning Time'],executionMs:plan['Execution Time'],plan};
        results.push(row);
        console.log(JSON.stringify({...row,plan:undefined}));
      } catch(e) { results.push({role,operation:i,code:e.code??e.name}); console.log(JSON.stringify({role,operation:i,code:e.code??e.name})); }
      finally { await client.query('ROLLBACK'); }
    }
  }
} catch(e) { console.log(JSON.stringify({error:e.code??e.name})); process.exitCode=1; }
finally { await client.end(); }
await fs.writeFile(new URL(process.argv[2] || 'db-plans.json',import.meta.url),JSON.stringify({measuredAt:new Date().toISOString(),syntheticPublicIdentity:true,results},null,2));
