import * as database from '../api/database.js';
import { logServerError } from '../api/errors.js';
import { FeedbackError } from '../domain/errors.js';
import * as repository from '../repositories/feedbackRepository.js';
import { feedbackMailAvailable, sendFeedbackNotification } from './feedbackMailer.js';

export async function feedbackNotificationSettings() {
  const settings = await database.withTransaction(client => repository.notificationSettings(client));
  return { ...settings, available: feedbackMailAvailable() };
}
export async function setFeedbackNotifications(enabled: boolean) {
  if (enabled && !feedbackMailAvailable()) throw new FeedbackError(503, 'L’envoi des notifications par e-mail n’est pas encore configuré.');
  const settings = await database.withTransaction(client => repository.notificationSettings(client, enabled));
  return { ...settings, available: feedbackMailAvailable() };
}

/** Awaited by the request, so serverless runtimes do not cut delivery off after responding. */
export async function deliverFeedbackNotifications() {
  if (!feedbackMailAvailable()) return;
  try {
    for (let count = 0; count < 3; count++) {
      const delivery = await database.withFeedbackDeliveryTransaction(repository.claimNotification);
      if (!delivery) return;
      let delivered = false;
      try { await sendFeedbackNotification(delivery); delivered = true; }
      catch (error) { logServerError('feedback_email_failed', error); }
      await database.withFeedbackDeliveryTransaction(client => repository.completeNotification(client, delivery.id, delivery.lease, delivered));
      if (!delivered) return;
    }
  } catch (error) { logServerError('feedback_email_queue_failed', error); }
}
