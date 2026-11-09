import nodemailer from 'nodemailer';
import { feedbackSubjects, type FeedbackNotificationDelivery } from '../shared/feedback.js';
import { SITE_ORIGIN } from '../shared/seoMetadata.js';

/** Configuration is server-only. Absence keeps notifications unavailable without affecting feedback. */
export function feedbackSmtpConfig(env: NodeJS.ProcessEnv = process.env) {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASSWORD: pass } = env;
  const from = env.SMTP_FROM || user;
  const port = Number(env.SMTP_PORT || '465');
  if (!host?.trim() || !user?.trim() || !pass || !from?.trim() || ![465, 587].includes(port)
    || /[\r\n]/.test(host + user + from)) return null;
  return { host, port, secure: port === 465, requireTLS: true, auth: { user, pass },
    tls: { rejectUnauthorized: true }, connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 8000,
    disableFileAccess: true, disableUrlAccess: true, from };
}
export const feedbackMailAvailable = () => feedbackSmtpConfig() !== null;

export function feedbackNotificationMessage(delivery: FeedbackNotificationDelivery) {
  const feedback = delivery.feedback;
  const subject = feedbackSubjects.find(item => item.value === feedback.subject)?.label ?? 'Autre';
  return {
    to: delivery.recipient,
    subject: `[Universal Timeline] Nouveau retour : ${subject}`,
    messageId: `<feedback-${delivery.id}@universaltimeline.net>`,
    text: `Un nouveau retour a été reçu sur Universal Timeline.\n\nObjet : ${subject}\nNote : ${feedback.rating === null ? 'Non renseignée' : `${feedback.rating}/5`}\n\n${feedback.message}\n\nPage consultée : ${feedback.pageUrl}\n\nConsulter et traiter ce retour : ${SITE_ORIGIN}/admin?section=feedback\n\nL’adresse de suivi, si l’utilisateur en laisse une après son message, est disponible dans l’administration.\n\nVous recevez cet e-mail car vous avez activé les notifications dans Administration → Retours utilisateurs. Vous pouvez les désactiver au même endroit.`,
  };
}
export async function sendFeedbackNotification(delivery: FeedbackNotificationDelivery) {
  const config = feedbackSmtpConfig();
  if (!config) throw new Error('SMTP unavailable');
  const { from, ...options } = config;
  const transport = nodemailer.createTransport(options);
  try {
    const result = await transport.sendMail({ from: { name: 'Universal Timeline', address: from }, ...feedbackNotificationMessage(delivery) });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('SMTP recipient refused');
  } finally { transport.close(); }
}
