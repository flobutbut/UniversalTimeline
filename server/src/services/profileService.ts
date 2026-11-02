import { withTransaction } from '../api/database.js';
import { ProfileError } from '../domain/errors.js';
import * as profiles from '../repositories/profileRepository.js';
import { CURRENT_TERMS_VERSION } from '../shared/accountRules.js';

const isoDate = (value: Date | string | null) => value === null ? null : new Date(value).toISOString();

function mapProfile(row: profiles.ProfileRow) {
  return {
    username: row.username, avatarColor: row.avatar_color, avatarIcon: row.avatar_icon,
    termsVersion: row.terms_version, termsAcceptedAt: isoDate(row.terms_accepted_at), createdAt: isoDate(row.created_at),
    currentTermsVersion: CURRENT_TERMS_VERSION,
  };
}

export async function getProfile() {
  const row = await withTransaction(client => profiles.readOwnProfile(client));
  return row ? mapProfile(row) : null;
}

export function saveProfile(data: { username: string; avatarColor: string; avatarIcon: string }) {
  return withTransaction(async client => {
    const previous = await profiles.readOwnProfile(client);
    const row = await profiles.upsertOwnProfile(client, data);
    if (previous?.username !== row.username) await profiles.renameOwnStoriesAuthor(client, row.username);
    return mapProfile(row);
  });
}

export function acceptTerms(version: string) {
  if (version !== CURRENT_TERMS_VERSION) throw new ProfileError(409, 'Les conditions ont changé : rechargez la page pour lire la version en vigueur.');
  return withTransaction(async client => {
    const row = await profiles.acceptOwnTerms(client, version);
    if (!row) throw new ProfileError(412, 'Choisissez d’abord un nom d’utilisateur.');
    return mapProfile(row);
  });
}

export const usernameAvailable = (username: string) => withTransaction(client => profiles.isUsernameAvailable(client, username));

export const deleteAccount = () => withTransaction(client => profiles.deleteOwnAccount(client));

export function exportData() {
  return withTransaction(async client => {
    const row = await profiles.readOwnProfile(client);
    return { exportedAt: new Date().toISOString(), profile: row ? mapProfile(row) : null, stories: await profiles.exportOwnStories(client) };
  });
}
