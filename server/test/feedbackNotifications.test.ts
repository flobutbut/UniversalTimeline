// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { feedbackSmtpConfig, feedbackNotificationMessage, sendFeedbackNotification } from '../src/services/feedbackMailer';
import * as database from '../src/api/database';
import * as repository from '../src/repositories/feedbackRepository';
import * as mailer from '../src/services/feedbackMailer';
import { deliverFeedbackNotifications, setFeedbackNotifications } from '../src/services/feedbackNotifications';

vi.mock('../src/api/database', () => ({ withTransaction: vi.fn(), withFeedbackDeliveryTransaction: vi.fn() }));
const smtp = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: smtp.createTransport } }));
const delivery = { id: 'delivery', lease: 'lease', recipient: 'admin@example.test', feedback: { id: 'feedback', rating: 5, subject: 'bug' as const, message: '<img src="https://example.test">\r\nBcc: other@example.test', pageUrl: 'https://universaltimeline.net/timeline?story=5', email: null, status: 'new' as const, createdAt: '2026-11-09T12:00:00Z' } };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
function configured() {
  vi.stubEnv('SMTP_HOST', 'smtp.hostinger.com'); vi.stubEnv('SMTP_PORT', '465'); vi.stubEnv('SMTP_USER', 'sender@example.test'); vi.stubEnv('SMTP_PASSWORD', 'test-only-secret');
  smtp.createTransport.mockReturnValue({ sendMail: smtp.sendMail, close: smtp.close });
}
it('requires server credentials and encrypted SMTP with certificate validation', () => {
  expect(feedbackSmtpConfig({})).toBeNull();
  expect(feedbackSmtpConfig({ SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'sender@example.test', SMTP_PASSWORD: 'secret', SMTP_PORT: '25' })).toBeNull();
  const config = feedbackSmtpConfig({ SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'sender@example.test', SMTP_PASSWORD: 'secret' });
  expect(config).toMatchObject({ port: 465, secure: true, requireTLS: true, tls: { rejectUnauthorized: true }, disableFileAccess: true, disableUrlAccess: true });
});
it('builds a text-only notification with the submitted page and a fixed admin destination', () => {
  const message = feedbackNotificationMessage(delivery);
  expect(message.to).toBe(delivery.recipient); expect(message.subject).toBe('[Universal Timeline] Nouveau retour : Bug technique');
  expect(message.text).toContain(delivery.feedback.message); expect(message.text).toContain(delivery.feedback.pageUrl);
  expect(message).not.toHaveProperty('html'); expect(message).not.toHaveProperty('bcc');
});
it('sends only to the stored account address and closes SMTP after delivery or refusal', async () => {
  configured(); smtp.sendMail.mockResolvedValueOnce({ accepted: ['admin@example.test'], rejected: [] }).mockResolvedValueOnce({ accepted: [], rejected: ['admin@example.test'] });
  await sendFeedbackNotification(delivery);
  expect(smtp.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@example.test', from: { name: 'Universal Timeline', address: 'sender@example.test' } }));
  await expect(sendFeedbackNotification(delivery)).rejects.toThrow('refused'); expect(smtp.close).toHaveBeenCalledTimes(2);
});
it('does not enable a nonfunctional notification preference when SMTP is absent', async () => {
  vi.spyOn(mailer, 'feedbackMailAvailable').mockReturnValue(false);
  await expect(setFeedbackNotifications(true)).rejects.toMatchObject({ status: 503 });
  expect(database.withTransaction).not.toHaveBeenCalled();
});
it('keeps SMTP failures separate from feedback persistence and records a retry without exposing content', async () => {
  vi.spyOn(mailer, 'feedbackMailAvailable').mockReturnValue(true);
  vi.mocked(database.withFeedbackDeliveryTransaction).mockImplementation(async operation => operation({} as any));
  vi.spyOn(repository, 'claimNotification').mockResolvedValue(delivery);
  const complete = vi.spyOn(repository, 'completeNotification').mockResolvedValue();
  vi.spyOn(mailer, 'sendFeedbackNotification').mockRejectedValue(new Error('secret SMTP error'));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(deliverFeedbackNotifications()).resolves.toBeUndefined();
  expect(complete).toHaveBeenCalledWith(expect.anything(), 'delivery', 'lease', false);
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
});
