import type { Request, Response, RequestHandler } from 'express';
import { sendApiError } from './errors.js';

type ErrorMessages = NonNullable<Parameters<typeof sendApiError>[3]>;
/** HTTP error translation stays at the boundary; services never depend on Express. */
export function endpoint(
  fallback: string,
  action: (req: Request, res: Response) => Promise<unknown>,
  messages?: ErrorMessages,
): RequestHandler {
  return async (req, res) => {
    try { await action(req, res); }
    catch (error) { sendApiError(res, error, fallback, messages); }
  };
}
