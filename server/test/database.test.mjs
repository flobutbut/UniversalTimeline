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
