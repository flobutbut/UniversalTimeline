import { createHash } from 'node:crypto';
import { withTransaction } from '../api/database.js';
import { FeedbackError, NotFoundError } from '../domain/errors.js';
import * as repository from '../repositories/feedbackRepository.js';
import type { FeedbackSubmission, FeedbackStatus, FeedbackFilters } from '../shared/feedback.js';
import { deliverFeedbackNotifications } from './feedbackNotifications.js';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export const feedbackSettings = (enabled: boolean | null = null) => withTransaction(client => repository.featureSettings(client, enabled));
export async function submitFeedback(data: FeedbackSubmission, fingerprint: string) {
  try { await withTransaction(client => repository.create(client, data, hash(data.token), fingerprint)); }
  catch (error) {
    if ((error as { code?: string }).code === 'UT429') throw new FeedbackError(429, 'Vous avez envoyé plusieurs retours récemment. Réessayez dans quelques minutes.');
    throw error;
  }
  await deliverFeedbackNotifications();
  return { id: data.id };
}
export async function addFeedbackEmail(id: string, token: string, email: string) {
  const saved = await withTransaction(client => repository.addEmail(client, id, hash(token), email));
  if (!saved) throw new NotFoundError('Ce retour ne peut plus recevoir d’adresse e-mail.');
}
export const listFeedback = (offset: number, filters: FeedbackFilters = {}) => withTransaction(client => repository.list(client, offset, filters));
export async function setFeedbackStatus(id: string, status: FeedbackStatus) {
  if (!await withTransaction(client => repository.setStatus(client, id, status))) throw new NotFoundError('Ce retour n’existe plus.');
}
export async function deleteFeedback(id: string) {
  if (!await withTransaction(client => repository.remove(client, id))) throw new NotFoundError('Ce retour n’existe plus.');
}
