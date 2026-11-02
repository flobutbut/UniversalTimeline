// User-facing messages for Supabase Auth errors, chosen by code only: provider messages are never shown.
interface AuthErrorLike { code?: string; name?: string }

export function rateLimitError(error: AuthErrorLike): string | null {
  switch (error.code) {
    case 'over_email_send_rate_limit': return 'La limite d’envoi des e-mails est atteinte. Réessayez plus tard.';
    case 'over_request_rate_limit': return 'Trop de tentatives rapprochées. Patientez quelques minutes avant de réessayer.';
    default: return null;
  }
}

export function weakPasswordError(error: AuthErrorLike): string | null {
  return error.code === 'weak_password' || error.name === 'AuthWeakPasswordError'
    ? 'Ce mot de passe est trop faible ou figure parmi les mots de passe compromis. Choisissez un mot de passe unique et plus robuste.'
    : null;
}

export function passwordUpdateError(error: AuthErrorLike): string {
  if (error.code === 'same_password') return 'Le nouveau mot de passe doit être différent de l’ancien.';
  if (error.code === 'session_not_found' || error.code === 'session_expired') return 'La session de réinitialisation a expiré. Demandez un nouveau lien.';
  return weakPasswordError(error) ?? rateLimitError(error) ?? 'Modification impossible. Réessayez ou demandez un nouveau lien.';
}

export function emailChangeError(error: AuthErrorLike): string {
  switch (error.code) {
    case 'email_exists': return 'Cette adresse est déjà utilisée par un autre compte.';
    case 'email_address_invalid':
    case 'validation_failed': return 'Cette adresse e-mail n’est pas acceptée. Vérifiez-la.';
    case 'email_address_not_authorized': return 'Le service d’e-mail du projet n’autorise pas encore cette adresse. Sa configuration doit être complétée.';
    default: return rateLimitError(error) ?? 'Changement d’adresse impossible. Réessayez plus tard.';
  }
}
