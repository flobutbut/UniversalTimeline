import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const steps = [
  ['Design system', ['verify:design']],
  ['Tests isolés', ['test', '--maxWorkers=4']],
  ['Configuration sans connexion', ['node', '--experimental-strip-types', '--test', 'server/test/database.test.mjs']],
  ['Symboles inutilisés', ['vue-tsc', '-p', 'tsconfig.audit-unused.json', '--noEmit']],
  ['Build frontend', ['build']],
  ['Build API', ['--cwd', 'server', 'build']],
];
for (const [label, args] of steps) {
  console.log(`\n${label}`);
  const result = spawnSync(process.platform === 'win32' ? 'yarn.cmd' : 'yarn', args, {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
