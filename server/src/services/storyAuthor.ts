import type { TransactionClient } from '../api/transaction.js';
import { principalContext } from '../auth/context.js';
import { ProfileError } from '../domain/errors.js';
import { readOwnProfile } from '../repositories/profileRepository.js';

// Runs inside the caller's transaction: no connection of its own, so story services stay testable without a database.
const ANONYMOUS_AUTHOR = 'Anonyme';
const signedIn = () => !!principalContext.getStore()?.userId;

/**
 * Byline of a new frise. A signed-in account signs with its unique username and cannot create
 * without one; without accounts (local mode) the requested author is kept.
 */
export async function creatorAuthor(client: TransactionClient, requested?: string | null): Promise<string> {
  if (!signedIn()) return requested?.trim() || ANONYMOUS_AUTHOR;
  const profile = await readOwnProfile(client);
  if (!profile) throw new ProfileError(412, 'Choisissez un nom d’utilisateur dans votre profil avant de créer une frise.');
  return profile.username;
}

/** An edit by a signed-in account keeps the stored author (null); without accounts the body may set it. */
export const editorAuthor = (requested?: string | null): string | null => signedIn() ? null : requested?.trim() || null;
