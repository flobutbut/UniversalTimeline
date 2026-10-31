import { createDatabaseConfig } from '../../server/src/config/database.ts';

const httpsOrigin = raw => {
  try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password && !url.hostname.includes('*') && url.pathname === '/' && !url.search && !url.hash && !/PROJECT_REF/i.test(raw) ? url.origin : null; }
  catch { return null; }
};
const publishable = value => typeof value === 'string' && value === value.trim() && value.startsWith('sb_publishable_') && value.length > 30 && !/REPLACE_ME/i.test(value);

/** Static review only. Results contain no configuration values or credentials. */
export function reviewConfig(server, frontend, production = false) {
  const checks = [];
  const add = (id, ok, hint) => checks.push({ id, ok: !!ok, hint });
  let database = false;
  try { createDatabaseConfig(server); database = !/PROJECT_REF|ENCODED_PASSWORD|POOLER_HOST/.test(server.DATABASE_URL); } catch { /* Never forward a parser/file error containing user input. */ }
  add('database', database, 'Connexion PostgreSQL et certificat : renseigner server/.env selon server/SUPABASE.md. Aucune connexion effectuée.');
  add('authentication', server.AUTH_ENABLED === 'true', 'AUTH_ENABLED=true est requis pour les accès utilisateurs et en production.');
  const serverOrigin = httpsOrigin(server.SUPABASE_URL);
  const frontOrigin = httpsOrigin(frontend.VITE_SUPABASE_URL);
  add('supabase', serverOrigin && publishable(server.SUPABASE_PUBLISHABLE_KEY), 'Configurer une URL Supabase HTTPS et sa clé publiable côté API.');
  add('frontend', frontOrigin && frontOrigin === serverOrigin && publishable(frontend.VITE_SUPABASE_PUBLISHABLE_KEY)
    && frontend.VITE_SUPABASE_PUBLISHABLE_KEY === server.SUPABASE_PUBLISHABLE_KEY, 'Les URL et clés publiables frontend/API doivent correspondre.');
  add('browser-secrets', !Object.keys(frontend).some(key => /^VITE_.*(?:DATABASE_URL|SECRET|SERVICE_ROLE|PASSWORD)/i.test(key)), 'Aucun secret privilégié ni connexion SQL dans les variables VITE_.');
  let origin = false;
  try {
    const url = new URL(server.FRONTEND_ORIGIN);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    origin = url.origin === server.FRONTEND_ORIGIN && !url.username && !url.password && !url.hostname.includes('*')
      && (production ? url.protocol === 'https:' && !local : url.protocol === 'https:' || local && url.protocol === 'http:');
  } catch { /* Report only the fixed hint below. */ }
  add('frontend-origin', origin, production ? 'FRONTEND_ORIGIN doit être le domaine HTTPS exact de livraison, sans chemin ni joker.' : 'FRONTEND_ORIGIN doit être une origine exacte HTTPS ou localhost de développement.');
  return checks;
}
