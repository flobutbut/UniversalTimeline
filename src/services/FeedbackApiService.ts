import { apiClient } from './ApiClient';
import type { FeedbackSubmission, FeedbackStatus, UserFeedback, FeedbackFilters } from '../../server/src/shared/feedback';
import type { FeedbackNotificationSettings } from '../../server/src/shared/feedback';

export const feedbackApi = {
  settings: () => apiClient.get<{ enabled: boolean }>('/feedback/settings'),
  setEnabled: (enabled: boolean) => apiClient.put<{ enabled: boolean }>('/admin/feedback/settings', { enabled }),
  submit: (data: FeedbackSubmission) => apiClient.post<{ id: string }>('/feedback', data),
  addEmail: (id: string, token: string, email: string) => apiClient.put<void>(`/feedback/${encodeURIComponent(id)}/email`, { token, email }),
  list: (offset = 0, filters: FeedbackFilters = {}) => apiClient.get<{ items: UserFeedback[]; total: number }>('/admin/feedback', { params: { offset, ...filters } }),
  setStatus: (id: string, status: FeedbackStatus) => apiClient.put<void>(`/admin/feedback/${encodeURIComponent(id)}/status`, { status }),
  remove: (id: string) => apiClient.delete<void>(`/admin/feedback/${encodeURIComponent(id)}`),
  notifications: () => apiClient.get<FeedbackNotificationSettings>('/admin/feedback/notifications'),
  setNotifications: (enabled: boolean) => apiClient.put<FeedbackNotificationSettings>('/admin/feedback/notifications', { enabled }),
};
