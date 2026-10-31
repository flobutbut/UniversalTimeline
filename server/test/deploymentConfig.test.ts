// @vitest-environment node
import { expect, it } from 'vitest';
import { reviewConfig } from '../../scripts/lib/config-review.mjs';

const key = 'sb_publishable_fictionalconfigurationtestonly';
const server = { DATABASE_URL: 'postgresql://fixture:fixture@db.example.test/postgres', AUTH_ENABLED: 'true', SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: key, FRONTEND_ORIGIN: 'http://127.0.0.1:5173' };
const frontend = { VITE_SUPABASE_URL: server.SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: key };
it('accepts matching local configuration without connecting to the database', () => {
  expect(reviewConfig(server, frontend).every(check => check.ok)).toBe(true);
});
it('requires the real HTTPS frontend origin before delivery', () => {
  expect(reviewConfig(server, frontend, true).find(check => check.id === 'frontend-origin')?.ok).toBe(false);
  expect(reviewConfig({ ...server, FRONTEND_ORIGIN: 'https://timeline.example.test' }, frontend, true).every(check => check.ok)).toBe(true);
});
it.each(['https://timeline.example.test/login', 'https://*.example.test', 'https://name:secret@example.test', 'http://remote.example.test'])('rejects a non-exact or unsafe origin: %s', origin => {
  expect(reviewConfig({ ...server, FRONTEND_ORIGIN: origin }, frontend, true).find(check => check.id === 'frontend-origin')?.ok).toBe(false);
});
it('detects mismatched Supabase projects and placeholder public keys', () => {
  expect(reviewConfig(server, { ...frontend, VITE_SUPABASE_URL: 'https://other.supabase.co' }).find(check => check.id === 'frontend')?.ok).toBe(false);
  expect(reviewConfig({ ...server, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_REPLACE_ME' }, frontend).find(check => check.id === 'supabase')?.ok).toBe(false);
});
it('never includes malformed credentials or certificate paths in its report', () => {
  const secret = 'sensitive-invalid-url';
  const report = reviewConfig({ ...server, DATABASE_URL: secret, DB_SSL_CA_PATH: '/private/fixture-secret-path' }, frontend);
  expect(report.find(check => check.id === 'database')?.ok).toBe(false);
  expect(JSON.stringify(report)).not.toContain(secret); expect(JSON.stringify(report)).not.toContain('fixture-secret-path');
});
it('detects frontend secrets and an authentication flag left off', () => {
  const report = reviewConfig({ ...server, AUTH_ENABLED: 'false' }, { ...frontend, VITE_SERVICE_ROLE_KEY: 'must-not-appear' });
  expect(report.find(check => check.id === 'browser-secrets')?.ok).toBe(false);
  expect(report.find(check => check.id === 'authentication')?.ok).toBe(false);
  expect(JSON.stringify(report)).not.toContain('must-not-appear');
});
