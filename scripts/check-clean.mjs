import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// All databases and sockets are inside uniquely named Docker resources. No .env is read.
const root = fileURLToPath(new URL('../', import.meta.url));
const id = randomUUID().slice(0, 12);
const label = `io.universaltimeline.check=${id}`;
const image = `universal-timeline-checks:${id}`;
const containers = new Set();
const volumes = new Set();
let child;
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { interrupted = true; child?.kill('SIGTERM'); });
function quiet(args) { return spawnSync('docker', args, { cwd: root, encoding: 'utf8' }); }
function run(args) {
  if (interrupted) return Promise.reject(new Error('Vérification interrompue.'));
  return new Promise((resolve, reject) => {
    const running = spawn('docker', args, { cwd: root, stdio: 'inherit' });
    child = running;
    running.once('error', reject);
    running.once('close', code => { if (child === running) child = undefined; code === 0 ? resolve() : reject(new Error(`Docker ${args[0]} : code ${code}.`)); });
  });
}
async function runChecks(name, args, options = []) {
  const container = `ut-check-${id}-${name}`;
  containers.add(container);
  await run(['run', '--rm', '--init', '--name', container, '--label', label, ...options, image, ...args]);
  containers.delete(container);
}
function owns(kind, name) {
  const labels = kind === 'container' ? '.Config.Labels' : '.Labels';
  const result = quiet([kind, 'inspect', '--format', `{{ index ${labels} "io.universaltimeline.check" }}`, name]);
  return result.stdout?.trim() === id;
}
function removeContainer(name) {
  if (owns('container', name)) {
    const result = quiet(['rm', '--force', '--volumes', name]);
    if (result.status !== 0) throw new Error(`Nettoyage du conteneur ${name} impossible.`);
  }
  containers.delete(name);
}
async function postgresSuite(name, file, restore = false) {
  const database = `universaltimeline_test_${name}`;
  const container = `ut-check-${id}-pg-${name}`;
  const volume = `ut-check-${id}-socket-${name}`;
  volumes.add(volume);
  await run(['volume', 'create', '--label', label, volume]);
  containers.add(container);
  await run(['run', '--detach', '--name', container, '--label', label, '--network', 'none',
    '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', '--env', `POSTGRES_DB=${database}`,
    '--mount', `type=volume,src=${volume},dst=/var/run/postgresql`, 'postgres:17-alpine',
    '-c', 'listen_addresses=', '-c', 'port=55439', '-c', 'unix_socket_permissions=0777']);
  let ready = false;
  for (let attempt = 0; attempt < 60 && !interrupted; attempt++) {
    const started = quiet(['exec', container, 'cat', '/proc/1/comm']).stdout?.trim() === 'postgres';
    if (started && quiet(['exec', container, 'pg_isready', '-h', '/var/run/postgresql', '-p', '55439', '-U', 'postgres', '-d', database]).status === 0) { ready = true; break; }
    await delay(500);
  }
  if (!ready) throw new Error(`PostgreSQL de test ${name} ne démarre pas.`);
  const options = ['--network', 'none', '--env', 'PGUSER=postgres', '--env', 'TIMELINE_TEST_SOCKET=/pgsocket',
    '--env', `TIMELINE_TEST_DATABASE=${database}`, '--mount', `type=volume,src=${volume},dst=/pgsocket`];
  console.log(`\nPostgreSQL 17 — ${name}`);
  await runChecks(name, ['node', '--experimental-test-module-mocks', '--test', `server/test/${file}`], options);
  if (restore) {
    // Only fictional rows created by this test suite are dumped, with their ACL/RLS.
    await run(['exec', container, 'pg_dump', '-h', '/var/run/postgresql', '-p', '55439', '-U', 'postgres',
      '--format=custom', '--schema=public', '--schema=auth', '--schema=account_private', '--file=/tmp/application.dump', database]);
    await run(['exec', container, 'createdb', '-h', '/var/run/postgresql', '-p', '55439', '-U', 'postgres', 'universaltimeline_test_restore']);
    // pg_dump includes CREATE SCHEMA public. Remove only the empty default schema on this new test target.
    await run(['exec', container, 'psql', '-h', '/var/run/postgresql', '-p', '55439', '-U', 'postgres',
      '--dbname=universaltimeline_test_restore', '--set=ON_ERROR_STOP=1', '--command=DROP SCHEMA public;']);
    await run(['exec', container, 'pg_restore', '-h', '/var/run/postgresql', '-p', '55439', '-U', 'postgres',
      '--exit-on-error', '--dbname=universaltimeline_test_restore', '/tmp/application.dump']);
    await runChecks('restore', ['node', '--test', 'server/test/baselineRestore.postgres.mjs'], [
      ...options, '--env', 'TIMELINE_TEST_DATABASE=universaltimeline_test_restore', '--env', `TIMELINE_TEST_SOURCE_DATABASE=${database}`,
    ]);
  }
  removeContainer(container);
  const removed = quiet(['volume', 'rm', volume]);
  if (removed.status !== 0) throw new Error('Nettoyage du socket de test impossible.');
  volumes.delete(volume);
}

try {
  if (quiet(['info', '--format', '{{.ServerVersion}}']).status !== 0) throw new Error('Docker doit être démarré pour cette vérification isolée.');
  await run(['build', '--progress=plain', '--label', label, '--tag', image, '--file', 'tools/checks/Dockerfile', '.']);
  await runChecks('isolated', ['yarn', 'verify'], ['--network', 'none']);
  await runChecks('audit-front', ['yarn', 'audit']);
  await runChecks('audit-api', ['yarn', '--cwd', 'server', 'audit']);
  await run(['pull', 'postgres:17-alpine']);
  for (const [name, file, restore] of [
    ['baseline', 'baseline.postgres.mjs', true], ['auth', 'auth.postgres.mjs'],
    ['hierarchy', 'periodHierarchy.postgres.mjs'], ['deletion', 'periodDeletion.postgres.mjs'],
    ['privileges', 'functionPrivileges.postgres.mjs'], ['atomic', 'atomicWrites.postgres.mjs'],
    ['profiles', 'profiles.postgres.mjs'],
  ]) await postgresSuite(name, file, restore);
  console.log('\nInstallation vierge, tests, audits, builds et restauration de test réussis.');
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : 'Échec de la vérification.');
  process.exitCode = 1;
} finally {
  for (const name of containers) { try { removeContainer(name); } catch (cause) { console.error(cause.message); process.exitCode = 1; } }
  for (const name of volumes) if (owns('volume', name) && quiet(['volume', 'rm', name]).status !== 0) process.exitCode = 1;
  if (quiet(['image', 'inspect', '--format', '{{ index .Config.Labels "io.universaltimeline.check" }}', image]).stdout?.trim() === id) quiet(['image', 'rm', image]);
}
