// Account rules shared by the API and the frontend (alias @account-rules). Pure: no I/O.
// The database repeats them as CHECK constraints (migration 20261102105902_account_profiles).

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,29}$/;
const RESERVED_USERNAMES = new Set(['admin', 'administrateur', 'anonyme', 'anonymous', 'moderateur', 'support', 'universaltimeline', 'system']);

export const AVATAR_COLORS = ['blue', 'green', 'amber', 'red', 'violet', 'pink', 'teal', 'slate'] as const;
export const AVATAR_ICONS = ['initial', 'telescope', 'earth', 'temple', 'dna', 'rocket', 'book', 'compass'] as const;
export type AvatarColor = typeof AVATAR_COLORS[number];
export type AvatarIcon = typeof AVATAR_ICONS[number];

/** Version of the terms of use and privacy notice accepted at sign-up; bump it when they change. */
export const CURRENT_TERMS_VERSION = '2026-11-03';

/** null when valid, otherwise the French message shown next to the field. */
export function usernameError(value: string): string | null {
  const name = value.trim();
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return `Le nom d’utilisateur doit contenir entre ${USERNAME_MIN} et ${USERNAME_MAX} caractères.`;
  if (!USERNAME_PATTERN.test(name)) return 'Utilisez des lettres sans accent, des chiffres, « _ », « . » ou « - », en commençant par une lettre ou un chiffre.';
  if (RESERVED_USERNAMES.has(name.toLowerCase())) return 'Ce nom d’utilisateur est réservé.';
  return null;
}

export const isAvatarColor = (value: unknown): value is AvatarColor => AVATAR_COLORS.includes(value as AvatarColor);
export const isAvatarIcon = (value: unknown): value is AvatarIcon => AVATAR_ICONS.includes(value as AvatarIcon);
