import type { TransactionClient } from '../api/transaction.js';
import type { FeedbackSubmission, FeedbackStatus, UserFeedback, FeedbackFilters } from '../shared/feedback.js';
import type { FeedbackNotificationDelivery } from '../shared/feedback.js';

export async function featureSettings(client: TransactionClient, enabled: boolean | null = null) {
  const sql = enabled === null ? 'SELECT feedback_private.is_enabled() AS enabled' : 'SELECT feedback_private.set_enabled($1) AS enabled';
  return (await client.query<{ enabled: boolean }>(sql, enabled === null ? [] : [enabled])).rows[0];
}

export async function create(client: TransactionClient, data: FeedbackSubmission, tokenHash: string, fingerprint: string) {
  await client.query('SELECT feedback_private.submit($1,$2,$3,$4,$5,$6,$7)', [data.id, tokenHash, data.rating, data.subject, data.message, data.pageUrl, fingerprint]);
}
export async function addEmail(client: TransactionClient, id: string, tokenHash: string, email: string) {
  return (await client.query<{ saved: boolean }>('SELECT feedback_private.add_email($1,$2,$3) AS saved', [id, tokenHash, email])).rows[0].saved;
}
export async function list(client: TransactionClient, offset: number, filters: FeedbackFilters = {}) {
  return (await client.query<{ result: { items: UserFeedback[]; total: number } }>('SELECT feedback_private.filtered_list($1,$2,$3) AS result', [offset, filters.subject ?? null, filters.status ?? null])).rows[0].result;
}
export async function setStatus(client: TransactionClient, id: string, status: FeedbackStatus) {
  return (await client.query<{ saved: boolean }>('SELECT feedback_private.set_status($1,$2) AS saved', [id, status])).rows[0].saved;
}
export async function remove(client: TransactionClient, id: string) {
  return (await client.query<{ removed: boolean }>('SELECT feedback_private.delete_submission($1) AS removed', [id])).rows[0].removed;
}
export async function notificationSettings(client: TransactionClient, enabled: boolean | null = null) {
  return (await client.query<{ result: { enabled: boolean; email: string | null } }>('SELECT feedback_private.notification_settings($1) AS result', [enabled])).rows[0].result;
}
export async function claimNotification(client: TransactionClient) {
  return (await client.query<{ result: FeedbackNotificationDelivery | null }>('SELECT feedback_private.claim_notification() AS result')).rows[0].result;
}
export async function completeNotification(client: TransactionClient, id: string, lease: string, delivered: boolean) {
  await client.query('SELECT feedback_private.complete_notification($1,$2,$3)', [id, lease, delivered]);
}
