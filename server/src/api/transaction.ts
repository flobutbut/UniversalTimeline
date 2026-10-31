import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

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
  const client = await provider.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}
