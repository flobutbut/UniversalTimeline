import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { reviewConfig } from './lib/config-review.mjs';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { parse } = require('dotenv');
async function configuration(path) {
  try { return parse(await readFile(new URL(path, import.meta.url))); }
  catch { return {}; }
}
const [server, frontend] = await Promise.all([configuration('../server/.env'), configuration('../.env.local')]);
const checks = reviewConfig(server, frontend, process.argv.includes('--production'));
for (const check of checks) console.log(`${check.ok ? 'OK' : 'À corriger'} — ${check.id}${check.ok ? '' : ' : ' + check.hint}`);
console.log('Contrôle statique local : ne vérifie ni les URL autorisées dans le Dashboard Auth, ni le réseau.');
if (checks.some(check => !check.ok)) process.exitCode = 1;
