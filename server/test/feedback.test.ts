// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { parseFeedback, parseFeedbackEmail, parseFeedbackStatus } from '../src/api/feedbackInput';
import { createAccessMiddleware } from '../src/auth/middleware';
import { feedbackPageUrl } from '../src/shared/feedback';

const receipt = { id: '00000000-0000-0000-0000-000000000001', token: '00000000-0000-0000-0000-000000000002' };
const valid = { ...receipt, subject: 'bug', rating: null, message: ' Une erreur sur la frise ', pageUrl: 'https://universaltimeline.net/timeline?story=5&period=root' };
it('accepts feedback without a rating and preserves the exact timeline context', () => {
  expect(parseFeedback(valid)).toEqual({ ...valid, message: valid.message.trim() });
  expect(parseFeedback({ ...valid, rating: 5 }).rating).toBe(5);
});
it.each([{ rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: '5' }, { subject: 'unknown' }, { message: '  ' }, { message: 'x'.repeat(5001) }, { pageUrl: 'javascript:alert(1)' }, { pageUrl: 'https://user:password@example.org/' }, { id: 'no' }, { token: null }])('rejects invalid submission %j', invalid => {
  expect(() => parseFeedback({ ...valid, ...invalid })).toThrow();
});
it('strips authentication secrets from URLs on both the public and API boundaries', () => {
  expect(feedbackPageUrl('https://example.org/reset-password?code=secret#access_token=secret')).toBe('https://example.org/reset-password');
  expect(parseFeedback({ ...valid, pageUrl: 'https://example.org/timeline?story=5&token=secret' }).pageUrl).toBe('https://example.org/timeline?story=5');
});
it('requires a receipt for email and rejects multi-recipient or header injection addresses', () => {
  expect(parseFeedbackEmail({ token: receipt.token, email: ' user@example.org ' })).toEqual({ token: receipt.token, email: 'user@example.org' });
  for (const email of ['bad', 'x@example.org\r\nBcc: a@b.org', 'a@b.org,c@d.org', 'a@b.org;c@d.org']) expect(() => parseFeedbackEmail({ token: receipt.token, email })).toThrow();
  expect(() => parseFeedbackEmail({ email: 'a@b.org' })).toThrow();
  expect(() => parseFeedbackStatus({ status: 'sent' })).toThrow();
});
it('permits anonymous feedback writes only on the two exact endpoints', async () => {
  const middleware = createAccessMiddleware(vi.fn());
  for (const [method, path, allowed] of [
    ['POST', '/feedback', true], ['PUT', `/feedback/${receipt.id}/email`, true],
    ['DELETE', '/feedback', false], ['POST', '/feedback/admin', false], ['PUT', `/feedback/${receipt.id}/status`, false],
    ['PUT', `/admin/feedback/${receipt.id}/status`, false], ['POST', '/stories', false],
  ] as const) {
    const res = { set: vi.fn(), locals: {}, status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res);
    const next = vi.fn();
    await middleware({ method, path, get: () => undefined } as any, res as any, next);
    expect(next.mock.calls.length, `${method} ${path}`).toBe(allowed ? 1 : 0);
  }
});
