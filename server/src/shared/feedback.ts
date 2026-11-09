export const feedbackSubjects = [
  { value: 'missing_timeline', label: 'Frise manquante', placeholder: 'Quelle frise aimeriez-vous retrouver ?' },
  { value: 'data_error', label: 'Erreur de données', placeholder: 'Quelle information faut-il corriger ? Si possible, indiquez une source.' },
  { value: 'feature', label: 'Suggestion de fonctionnalité', placeholder: 'Que souhaiteriez-vous pouvoir faire sur le site ?' },
  { value: 'bug', label: 'Bug technique', placeholder: 'Que faisiez-vous ? Que s’est-il passé et qu’attendiez-vous ?' },
  { value: 'other', label: 'Autre', placeholder: 'Partagez votre remarque ou votre idée…' },
] as const;
export type FeedbackSubject = typeof feedbackSubjects[number]['value'];
export const feedbackStatuses = [
  { value: 'new', label: 'Nouveau' }, { value: 'in_progress', label: 'À traiter' }, { value: 'resolved', label: 'Résolu' },
] as const;
export type FeedbackStatus = typeof feedbackStatuses[number]['value'];
export interface FeedbackFilters {
  subject?: FeedbackSubject | null;
  status?: FeedbackStatus | null;
}
export interface FeedbackSubmission {
  id: string; token: string; rating: number | null; subject: FeedbackSubject; message: string; pageUrl: string;
}
export interface UserFeedback {
  id: string; rating: number | null; subject: FeedbackSubject; message: string; pageUrl: string;
  email: string | null; status: FeedbackStatus; createdAt: string;
}
export interface FeedbackNotificationSettings {
  enabled: boolean;
  email: string | null;
  available: boolean;
}
export interface FeedbackNotificationDelivery {
  id: string;
  lease: string;
  recipient: string;
  feedback: UserFeedback;
}
/** Preserve navigation context without keeping login credentials or recovery tokens. */
export function feedbackPageUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Adresse de page invalide.');
  for (const key of [...url.searchParams.keys()]) {
    if (/token|password|secret|^code$|^key$/i.test(key)) url.searchParams.delete(key);
  }
  if (/token|password|secret|code=/i.test(url.hash) || /\/(login|reset-password)\/?$/.test(url.pathname)) url.hash = '';
  return url.href;
}
