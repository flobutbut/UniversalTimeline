import { feedbackSubjects, type UserFeedback } from '../../server/src/shared/feedback';

export function feedbackReply(feedback: UserFeedback) {
  const subject = feedbackSubjects.find(item => item.value === feedback.subject)?.label ?? 'Votre retour';
  const response = feedback.status === 'resolved'
    ? 'Votre retour a été traité.\n\n[Précisez ici la correction ou la réponse apportée.]'
    : 'Nous avons bien reçu votre retour et l’avons pris en compte.\n\n[Précisez ici la suite envisagée, si nécessaire.]';
  return {
    subject: `[Universal Timeline] ${subject}`,
    body: `Bonjour,\n\nMerci d’avoir pris le temps de nous écrire.\n\n${response}\n\nVotre message :\n${feedback.message}\n\nPage concernée : ${feedback.pageUrl}\n\nBonne journée,\nUniversal Timeline`,
  };
}
export function feedbackMailto(email: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
