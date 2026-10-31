import type { Server } from 'node:http';
import { logServerError } from '../api/errors.js';

/** Drain HTTP work before closing PostgreSQL; never wait forever or keep serving after a fatal error. */
export function createShutdown(options: {
  server: () => Server | undefined;
  closePool: () => Promise<void>;
  exit: (code: number) => void;
  timeoutMs?: number;
}) {
  let pending: Promise<void> | undefined;
  let stopping = false;
  let desiredCode = 0;
  let exited = false;
  const finish = (code: number) => { if (!exited) { exited = true; options.exit(code); } };
  function shutdown(reason: string, exitCode = 0): Promise<void> {
    desiredCode = Math.max(desiredCode, exitCode);
    if (pending) return pending;
    stopping = true;
    console.log(JSON.stringify({ event: 'shutdown_started', reason }));
    pending = (async () => {
      const server = options.server();
      const deadline = setTimeout(() => {
        logServerError('shutdown_timeout', new Error('Timeout'));
        try { server?.closeAllConnections(); }
        catch (error) { logServerError('http_force_close_failed', error); }
        finish(1);
      }, options.timeoutMs ?? 10000);
      deadline.unref();
      try {
        await new Promise<void>((resolve, reject) => {
          if (!server) { resolve(); return; }
          server.close(error => error ? reject(error) : resolve());
        });
      } catch (error) { desiredCode = 1; logServerError('http_close_failed', error); }
      try { await options.closePool(); }
      catch (error) { desiredCode = 1; logServerError('database_close_failed', error); }
      finally { clearTimeout(deadline); finish(desiredCode); }
    })();
    return pending;
  }
  return { shutdown, isStopping: () => stopping };
}
