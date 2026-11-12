import type { ErrorRequestHandler, Response } from 'express';
import { InvalidCategoriesError } from './entityCategories.js';
import { NotFoundError, PeriodHierarchyError, PeriodDeletionError, StoryAssociationError, ProfileError, AdminError, CatalogueConversionError, WikidataGenerationConflictError } from '../domain/errors.js';
import { InputValidationError } from './inputValidation.js';
import { FeedbackError } from '../domain/errors.js';

interface ErrorMessages { conflict?: string; busy?: string; foreignKey?: string; forbidden?: string }
const record = (error: unknown): Record<string, unknown> => error !== null && typeof error === 'object' ? error as Record<string, unknown> : {};
export function databaseFailureReason(error: unknown): string | undefined {
  const fields = record(error);
  if (fields.code === 'XX000' && typeof fields.message === 'string' && /\b(?:EMAXCONNSESSION|MaxClientsInSessionMode|max clients reached in session mode)\b/i.test(fields.message)) return 'database_pool_full';
  if (['53300', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ETIMEDOUT', '08006', '08001', '57P01', '57014'].includes(String(fields.code))) return 'database_unavailable';
  if (fields instanceof Error && /^(?:timeout exceeded when trying to connect|Connection terminated due to connection timeout)$/.test(fields.message)) return 'database_connection_timeout';
  return undefined;
}

/** Never log messages/stacks, request bodies, SQL, parameters or connection URLs. */
export function logServerError(event: string, error: unknown, operation?: string) {
  const fields = record(error);
  const code = typeof fields.code === 'string' && /^[A-Z0-9_]{2,32}$/.test(fields.code) ? fields.code : undefined;
  const kind = error instanceof Error && /^[A-Za-z][\w]{0,40}$/.test(error.name) ? error.name : 'UnknownError';
  const reason = databaseFailureReason(error);
  console.error(JSON.stringify({ event, kind, ...(code ? { code } : {}), ...(reason ? { reason } : {}), ...(operation ? { operation } : {}) }));
}

export function publicApiError(error: unknown, fallback: string, messages: ErrorMessages = {}): { status: number; message: string } {
  if (error instanceof WikidataGenerationConflictError) return { status: 409, message: error.message };
  if (error instanceof NotFoundError) return { status: 404, message: error.message };
  if (error instanceof FeedbackError) return { status: error.status, message: error.message };
  if (error instanceof InputValidationError) return { status: 400, message: error.message };
  if (error instanceof InvalidCategoriesError) return { status: 400, message: error.message };
  if (error instanceof PeriodHierarchyError || error instanceof PeriodDeletionError || error instanceof StoryAssociationError || error instanceof ProfileError || error instanceof AdminError || error instanceof CatalogueConversionError) return { status: error.status, message: error.message };
  const fields = record(error);
  if (databaseFailureReason(error)) return { status: 503, message: 'La base de données est temporairement indisponible. Réessayez.' };
  if (fields.type === 'entity.parse.failed') return { status: 400, message: 'Le corps de la requête doit être un JSON valide.' };
  if (fields.type === 'entity.too.large') return { status: 413, message: 'Le contenu de la requête est trop volumineux.' };
  switch (fields.code) {
    case 'UT503': return { status: 503, message: 'Les retours utilisateurs sont désactivés.' };
    case '42501': return { status: 403, message: messages.forbidden ?? 'Vous n’avez pas accès à cette opération.' };
    case '23505': return { status: 409, message: messages.conflict ?? 'Cet identifiant est déjà utilisé.' };
    case '23514': return { status: 409, message: 'Ce classement est invalide ou créerait un cycle dans la frise.' };
    case '23503': return { status: 409, message: messages.foreignKey ?? 'Cet élément est encore lié à d’autres données ou référence un élément absent.' };
    case '22P02': return { status: 400, message: 'Un identifiant ou une valeur est invalide.' };
    case '55P03': case '40P01': case '40001': return { status: 503, message: messages.busy ?? 'Le service est occupé. Réessayez.' };
    case 'ECONNREFUSED': case 'ETIMEDOUT': case '08006': case '08001': case '57P01':
      return { status: 503, message: 'La base de données est temporairement indisponible. Réessayez.' };
    default: return { status: 500, message: fallback };
  }
}

export function sendApiError(res: Response, error: unknown, fallback: string, messages?: ErrorMessages) {
  const failure = publicApiError(error, fallback, messages);
  if (failure.status === 503) res.set?.('Retry-After', '2');
  if (failure.status >= 500) logServerError('api_error', error, fallback);
  return res.status(failure.status).json({ error: failure.message, ...(error instanceof InputValidationError ? { fields: error.fields } : {}), ...(error instanceof WikidataGenerationConflictError ? { existingStories: error.existingStories } : {}) });
}

export const apiErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    logServerError('response_interrupted', error);
    const safe = new Error('La réponse a été interrompue.');
    safe.stack = undefined;
    next(safe);
    return;
  }
  sendApiError(res, error, 'Une erreur est survenue sur le serveur');
};
