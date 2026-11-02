import { apiClient } from './ApiClient';
import type { AvatarColor, AvatarIcon } from '@account-rules';

export interface AccountProfile {
  username: string;
  avatarColor: AvatarColor;
  avatarIcon: AvatarIcon;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  createdAt: string | null;
  /** Version of the terms currently in force, served by the API. */
  currentTermsVersion: string;
}
export interface ProfileWrite { username: string; avatarColor: AvatarColor; avatarIcon: AvatarIcon }

/** The API only ever reads or writes the signed-in account's own profile. */
export const profileApi = {
  get: () => apiClient.get<AccountProfile | null>('/profile'),
  save: (data: ProfileWrite) => apiClient.put<AccountProfile>('/profile', data),
  acceptTerms: (version: string) => apiClient.post<AccountProfile>('/profile/terms', { version }),
  usernameAvailable: (username: string, signal?: AbortSignal) =>
    apiClient.get<{ available: boolean }>('/profile/username-availability', { params: { username }, signal }).then(result => result.available),
  exportData: () => apiClient.get<Record<string, unknown>>('/profile/export'),
  deleteAccount: () => apiClient.delete<void>('/profile'),
};
