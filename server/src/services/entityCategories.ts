import type { TransactionClient } from '../api/transaction.js';
import { readEntityCategories as readCategories } from '../repositories/categoryRepository.js';
import { localized } from './mappers.js';
export async function readEntityCategories(client: TransactionClient, kind: 'period' | 'event' | 'story', id: string | number) {
  return (await readCategories(client, kind, id)).map(row => ({ id: row.id, label: localized(row.label_fr, row.label_en) }));
}
