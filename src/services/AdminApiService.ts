import { apiClient } from './ApiClient';
import type { AvatarColor, AvatarIcon } from '@account-rules';
import type { RelationsNetwork, RelationsContent, RelationEntity, RelationEntityKind, RelationCatalogue } from '@/types/adminRelations';

export type AdminAction = 'grant_admin' | 'revoke_admin' | 'grant_editor' | 'revoke_editor' | 'suspend' | 'reactivate' | 'delete_user';

export interface AdminDashboard {
  generatedAt: string;
  users: { total: number; confirmed: number; withProfile: number; creators: number; new7d: number; new30d: number; active30d: number; admins: number; suspended: number };
  stories: { total: number; public: number; private: number; roots: number; children: number; empty: number; created30d: number; updated30d: number };
  catalogue: { periods: number; periodsWithQid: number; periodsUnused: number; events: number; eventsWithQid: number; eventsUnused: number; categories: number };
  relations: { storyPeriods: number; storyEvents: number; childStories: number; anchors: number; entryPoints: number; presentations: number; categoryLinks: number };
  topStories: { id: number; title: string; author: string; isPublic: boolean; periods: number; events: number }[];
  recentUsers: { id: string; username: string | null; createdAt: string; confirmed: boolean }[];
  recentActions: { action: AdminAction; targetId: string; targetUsername: string | null; actorUsername: string | null; createdAt: string }[];
}

export interface AdminUser {
  id: string; email: string | null; username: string | null; avatarColor: AvatarColor | null; avatarIcon: AvatarIcon | null;
  createdAt: string; lastSignInAt: string | null; confirmed: boolean; isAdmin: boolean; isEditor?: boolean; suspended: boolean;
  stories: number; publicStories: number;
}

export interface AdminUserDetail extends AdminUser {
  termsVersion: string | null; termsAcceptedAt: string | null;
  storyList: { id: number; title: string; isPublic: boolean; parentStoryId: number | null; updatedAt: string | null; periods: number; events: number }[];
  history: { action: AdminAction; actorUsername: string | null; createdAt: string }[];
}

/** Admin console: every route is refused to non-admins by the API and again by the database. */
export const adminApi = {
  relations: (signal?: AbortSignal) => apiClient.get<RelationsNetwork>('/admin/relations/network', { signal }),
  relationStory: (id: string, signal?: AbortSignal) => apiClient.get<RelationsContent>(`/admin/relations/stories/${encodeURIComponent(id)}`, { signal }),
  relationEntity: (kind: RelationEntityKind, id: string, signal?: AbortSignal) => apiClient.get<RelationEntity>(`/admin/relations/entities/${kind}/${encodeURIComponent(id)}`, { signal }),
  relationCatalogue: (kind: RelationEntityKind, usage: string, q: string, offset: number, signal?: AbortSignal) =>
    apiClient.get<RelationCatalogue>('/admin/relations/catalogue', { params: { kind, usage, q, offset }, signal }),
  dashboard: () => apiClient.get<AdminDashboard>('/admin/dashboard'),
  users: () => apiClient.get<AdminUser[]>('/admin/users'),
  user: (id: string) => apiClient.get<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`),
  setAdmin: (id: string, admin: boolean) => apiClient.put<void>(`/admin/users/${encodeURIComponent(id)}/role`, { admin }),
  setEditor: (id: string, editor: boolean) => apiClient.put<void>(`/admin/users/${encodeURIComponent(id)}/editor`, { editor }),
  setSuspended: (id: string, suspended: boolean) => apiClient.put<void>(`/admin/users/${encodeURIComponent(id)}/suspension`, { suspended }),
  deleteUser: (id: string) => apiClient.delete<void>(`/admin/users/${encodeURIComponent(id)}`),
};

export const adminActionLabels: Record<AdminAction, string> = {
  grant_admin: 'Rôle administrateur accordé', revoke_admin: 'Rôle administrateur retiré',
  grant_editor: 'Rôle éditeur accordé', revoke_editor: 'Rôle éditeur retiré',
  suspend: 'Compte suspendu', reactivate: 'Compte réactivé', delete_user: 'Compte supprimé',
};
