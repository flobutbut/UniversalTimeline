import type { RequestHandler } from 'express';
import { principalContext, type Principal } from './context.js';

export interface VerifiedUser { id: string; is_anonymous?: boolean; app_metadata?: Record<string, unknown>; banned_until?: string | null }

/** A suspension set by an admin applies from the next request, without waiting for the token to expire. */
const isSuspended = (user: VerifiedUser) => !!user.banned_until && Date.parse(user.banned_until) > Date.now();
export type VerifyToken = (token: string) => Promise<VerifiedUser | null>;

export function createAccessMiddleware(verify: VerifyToken): RequestHandler {
  return async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      const header = req.get('authorization');
      let principal: Principal = { userId: null, isAdmin: false };
      if (header) {
        const token = /^Bearer ([^\s]+)$/i.exec(header)?.[1];
        if (!token) { res.status(401).json({ error: 'Connexion requise.' }); return; }
        const user = await verify(token);
        if (!user || user.is_anonymous || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.id)) {
          res.status(401).json({ error: 'Session expirée ou invalide. Reconnectez-vous.' }); return;
        }
        if (isSuspended(user)) { res.status(403).json({ error: 'Ce compte est suspendu.' }); return; }
        principal = { userId: user.id, isAdmin: user.app_metadata?.role === 'admin', isEditor: user.app_metadata?.role === 'editor' };
      }
      if (!principal.userId && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        res.status(401).json({ error: 'Connexion requise.' }); return;
      }
      res.locals.principal = principal;
      principalContext.run(principal, next);
    } catch {
      res.status(503).json({ error: 'La vérification de connexion est indisponible. Réessayez.' });
    }
  };
}
