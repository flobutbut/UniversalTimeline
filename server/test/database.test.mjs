import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseConfig } from '../src/config/database.ts';

const connection = 'postgresql://postgres.project:encoded%40password@pooler.example:5432/postgres';

test('rejects missing credentials without falling back to a local database', () => {
  assert.throws(() => createDatabaseConfig({}), /DATABASE_URL manquante/);
  assert.throws(() => createDatabaseConfig({ DATABASE_URL: 'postgresql://user@localhost/db' }), /mot de passe/);
});

test('does not disclose a malformed credential in errors', () => {
  const secret = 'private-password-invalid-url';
  assert.throws(() => createDatabaseConfig({ DATABASE_URL: secret }), error => !error.message.includes(secret));
});

test('rejects URL parameters that could disable certificate verification', () => {
  for (const option of ['sslmode=disable', 'sslmode=no-verify', 'ssl=false', 'sslrootcert=other.pem', 'uselibpqcompat=true']) {
    assert.throws(() => createDatabaseConfig({ DATABASE_URL: connection + '?' + option }), /options SSL/);
  }
});

test('keeps TLS verified and encoded passwords intact', () => {
  const config = createDatabaseConfig({ DATABASE_URL: connection });
  assert.equal(new URL(config.connectionString).password, 'encoded%40password');
  assert.equal(config.ssl.rejectUnauthorized, true);
});
test('uses transaction pooling only for the existing Supavisor session endpoint on Vercel', () => {
  const url='postgresql://postgres.project:encoded%40password@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
  const deployed=createDatabaseConfig({DATABASE_URL:url,VERCEL:'1'});
  assert.equal(new URL(deployed.connectionString).port,'6543');
  assert.equal(new URL(deployed.connectionString).password,'encoded%40password');
  assert.equal(deployed.idleTimeoutMillis,5000);
  assert.equal(deployed.statement_timeout,undefined);
  assert.equal(new URL(createDatabaseConfig({DATABASE_URL:url}).connectionString).port,'5432');
  assert.equal(new URL(createDatabaseConfig({DATABASE_URL:connection,VERCEL:'1'}).connectionString).port,'5432');
});
