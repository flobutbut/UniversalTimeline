import axios, { type AxiosRequestConfig } from 'axios';
import { authService } from './AuthService';

const instance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});
instance.interceptors.request.use(async config => {
  if (config.baseURL !== '/api' || !config.url?.startsWith('/') || config.url.startsWith('//')) throw new Error('Un chemin API local est requis.');
  const token = await authService.getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});
instance.interceptors.response.use(response => response, error => {
  if (axios.isAxiosError(error) && error.code !== 'ERR_CANCELED') {
    const message = error.response?.data?.error;
    error.message = typeof message === 'string' && message.length < 500 ? message
      : error.code === 'ECONNABORTED' ? 'Le chargement prend trop de temps. Réessayez.'
      : error.response ? 'Le service est momentanément indisponible. Réessayez.' : 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  return Promise.reject(error);
});

export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.get<T>(url, { timeout: 20000, ...config }).then(r => r.data),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.post<T>(url, data, config).then(r => r.data),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.put<T>(url, data, config).then(r => r.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.patch<T>(url, data, config).then(r => r.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.delete<T>(url, config).then(r => r.data),
};
