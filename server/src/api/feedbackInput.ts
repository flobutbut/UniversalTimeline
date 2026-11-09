import { inputObject, InputValidationError, parseUserId } from './inputValidation.js';
import { feedbackPageUrl, feedbackSubjects, feedbackStatuses, type FeedbackSubmission, type FeedbackStatus } from '../shared/feedback.js';
import type { FeedbackFilters } from '../shared/feedback.js';

export function parseFeedbackFilters(value: unknown): FeedbackFilters {
  const { subject, status } = inputObject(value);
  if (subject !== undefined && !feedbackSubjects.some(item => item.value === subject)) throw new InputValidationError('subject', 'Objet invalide.');
  if (status !== undefined && !feedbackStatuses.some(item => item.value === status)) throw new InputValidationError('status', 'Statut invalide.');
  return { subject: subject as FeedbackFilters['subject'], status: status as FeedbackFilters['status'] };
}

export function parseFeedback(value: unknown): FeedbackSubmission {
  const body = inputObject(value);
  const id = parseUserId(body.id), token = parseUserId(body.token);
  if (!feedbackSubjects.some(subject => subject.value === body.subject)) throw new InputValidationError('subject', 'Choisissez un objet.');
  const rating = body.rating ?? null;
  if (rating !== null && (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)) throw new InputValidationError('rating', 'La note doit être comprise entre 1 et 5.');
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 5000 || body.message.includes('\0')) throw new InputValidationError('message', 'Écrivez un message de 1 à 5 000 caractères.');
  let pageUrl: string;
  try {
    if (typeof body.pageUrl !== 'string' || body.pageUrl.length > 4000) throw new Error();
    pageUrl = feedbackPageUrl(body.pageUrl);
  } catch { throw new InputValidationError('pageUrl', 'Adresse de page invalide.'); }
  return { id, token, rating, subject: body.subject as FeedbackSubmission['subject'], message: body.message.trim(), pageUrl };
}
export function parseFeedbackEmail(value: unknown) {
  const body = inputObject(value), token = parseUserId(body.token);
  if (typeof body.email !== 'string' || body.email.trim().length > 254 || !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(body.email.trim())) throw new InputValidationError('email', 'Renseignez une adresse e-mail valide.');
  return { token, email: body.email.trim() };
}
export function parseFeedbackStatus(value: unknown): FeedbackStatus {
  const status = inputObject(value).status;
  if (!feedbackStatuses.some(item => item.value === status)) throw new InputValidationError('status', 'Statut invalide.');
  return status as FeedbackStatus;
}
