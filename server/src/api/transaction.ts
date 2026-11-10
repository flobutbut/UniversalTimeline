import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { measureTiming } from './metrics.js';

export interface TransactionClient {
  query<Row extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<Row>>;
}
export interface ConnectionProvider {
  connect(): Promise<PoolClient>;
}

/** Every statement, including rollback, must use the same checked-out client. */
export async function runInTransaction<T>(
  provider: ConnectionProvider,
  operation: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  const client = await measureTiming('dbWaitMs', () => provider.connect());
  let discard = false;
  try {
    await measureTiming('sqlMs', () => client.query("BEGIN; SET LOCAL statement_timeout = '15s'; SET LOCAL idle_in_transaction_session_timeout = '15s'"));
    const result = await operation(client);
    await measureTiming('sqlMs', () => client.query('COMMIT'));
    return result;
  } catch (error) {
    try {
      await measureTiming('sqlMs', () => client.query('ROLLBACK'));
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}
