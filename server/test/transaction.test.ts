// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { runInTransaction } from '../src/api/transaction';

function fixture() {
  const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
  const provider = { connect: vi.fn().mockResolvedValue(client) };
  return { client, provider };
}

describe('transaction lifecycle', () => {
  it('commits only after all operations and returns the result', async () => {
    const { client, provider } = fixture();
    const result = await runInTransaction(provider, async connection => {
      expect(connection).toBe(client);
      await connection.query('UPDATE first');
      await connection.query('UPDATE second');
      return 'saved';
    });
    expect(result).toBe('saved');
    expect(client.query.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'UPDATE first', 'UPDATE second', 'COMMIT']);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('rolls back earlier writes when a later operation fails', async () => {
    const { client, provider } = fixture();
    const failure = new Error('foreign key rejected');
    await expect(runInTransaction(provider, async connection => {
      await connection.query('DELETE associations');
      throw failure;
    })).rejects.toBe(failure);
    expect(client.query.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'DELETE associations', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('discards a connection whose rollback fails and preserves the original error', async () => {
    const { client, provider } = fixture();
    client.query.mockImplementation(async sql => {
      if (sql === 'ROLLBACK') throw new Error('connection lost');
      return { rows: [] };
    });
    const failure = new Error('original write failure');
    await expect(runInTransaction(provider, async () => { throw failure; })).rejects.toBe(failure);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('does not report success if COMMIT fails', async () => {
    const { client, provider } = fixture();
    client.query.mockImplementation(async sql => {
      if (sql === 'COMMIT') throw new Error('commit failed');
      return { rows: [] };
    });
    await expect(runInTransaction(provider, async () => 'saved')).rejects.toThrow('commit failed');
    expect(client.query.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'COMMIT', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('does not run the operation when acquiring the connection fails', async () => {
    const { client, provider } = fixture();
    provider.connect.mockRejectedValue(new Error('pool exhausted'));
    const operation = vi.fn();
    await expect(runInTransaction(provider, operation)).rejects.toThrow('pool exhausted');
    expect(operation).not.toHaveBeenCalled();
    expect(client.release).not.toHaveBeenCalled();
  });
  it('does not perform writes if BEGIN fails and releases the connection', async () => {
    const { client, provider } = fixture();
    client.query.mockRejectedValueOnce(new Error('cannot begin transaction'));
    const operation = vi.fn();
    await expect(runInTransaction(provider, operation)).rejects.toThrow('cannot begin transaction');
    expect(operation).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledOnce();
  });

});
