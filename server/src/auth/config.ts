import { createClient } from '@supabase/supabase-js';
import { createAccessMiddleware } from './middleware.js';

export function authEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.AUTH_ENABLED && !['true', 'false'].includes(env.AUTH_ENABLED)) throw new Error('AUTH_ENABLED doit valoir true ou false.');
  if (env.NODE_ENV === 'production' && env.AUTH_ENABLED !== 'true') {
    throw new Error('AUTH_ENABLED=true est requis en production.');
  }
  return env.AUTH_ENABLED === 'true';
}

export function configuredAccessMiddleware() {
  if (!authEnabled()) return undefined;
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key?.startsWith('sb_publishable_') || new URL(url).protocol !== 'https:') {
    throw new Error('Authentification : URL Supabase HTTPS et clé publiable requises.');
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return createAccessMiddleware(async token => {
    const { data, error } = await client.auth.getUser(token);
    if (error) {
      if (!error.status || error.status >= 500) throw new Error('Auth unavailable');
      return null;
    }
    return data.user;
  });
}
