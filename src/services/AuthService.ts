import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let enabled: boolean | null = null;
let initialization: Promise<void> | null = null;
let rejectedToken: string | undefined;

export interface Account { id: string; isAdmin: boolean; isEditor?: boolean }

async function initialize(): Promise<void> {
  if (enabled !== null) return;
  if (initialization) return initialization;
  initialization = (async () => {
    const response = await fetch('/api/access', { cache: 'no-store' });
    if (!response.ok) throw new Error('Impossible de vérifier les accès. Réessayez.');
    const data: unknown = await response.json();
    if (!data || typeof (data as { enabled?: unknown }).enabled !== 'boolean') throw new Error('Configuration des accès invalide.');
    const active = (data as { enabled: boolean }).enabled;
    if (active) {
      const url = import.meta.env.VITE_SUPABASE_URL; const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!url || new URL(url).protocol !== 'https:' || !key?.startsWith('sb_publishable_')) throw new Error('La connexion utilisateur reste à configurer.');
      const { createClient } = await import('@supabase/supabase-js');
      client = createClient(url, key, { auth: { flowType: 'pkce' } });
    }
    enabled = active;
  })().finally(() => { initialization = null; });
  return initialization;
}

export const authService = {
  initialize,
  isEnabled: () => enabled,
  getClient: () => client,
  async getAccessToken(): Promise<string | undefined> {
    if (!enabled || !client) return undefined;
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error('Session indisponible. Reconnectez-vous.');
    const token = data.session?.access_token;
    return token && token !== rejectedToken ? token : undefined;
  },
  async getAccount(): Promise<Account | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    const response = await fetch('/api/account', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (response.status === 401) { rejectedToken = token; return null; }
    if (!response.ok) throw new Error('Impossible de vérifier votre compte. Réessayez.');
    const account: unknown = await response.json();
    if (!account || typeof (account as { id?: unknown }).id !== 'string' || typeof (account as { isAdmin?: unknown }).isAdmin !== 'boolean') throw new Error('Réponse de connexion invalide.');
    if ('isEditor' in (account as Account) && typeof (account as Account).isEditor !== 'boolean') throw new Error('Réponse de connexion invalide.');
    return account as Account;
  },
  /** Resolves once the SDK has consumed a one-time `code` from the URL (PKCE return); the code can then leave the URL. */
  async settleUrlSession(): Promise<void> {
    await initialize();
    await client?.auth.getSession().catch(() => undefined);
  },
  /** Email (and pending new email), sign-up date of the local session; only shown to the account itself. */
  async getIdentity(): Promise<{ email: string | null; newEmail: string | null; createdAt: Date | null }> {
    const { data, error } = await client?.auth.getUser() ?? { data: { user: null }, error: null };
    if (error) throw new Error('Profil indisponible. Réessayez.');
    const created = data.user?.created_at ? new Date(data.user.created_at) : null;
    return { email: data.user?.email ?? null, newEmail: data.user?.new_email ?? null, createdAt: created && Number.isFinite(created.getTime()) ? created : null };
  },
};
