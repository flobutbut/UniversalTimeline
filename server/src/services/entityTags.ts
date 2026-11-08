import type { TransactionClient } from '../api/transaction.js';
import { readEntityTags, replaceEntityTags, setPeriodNonThematic, type TaggedEntity } from '../repositories/tagRepository.js';
import { mapTag } from './mappers.js';

/** Writes the tags when given, then returns the tags as stored. */
export async function saveEntityTags(client: TransactionClient, entity: TaggedEntity, id: string | number, tags: string[] | undefined) {
  await replaceEntityTags(client, entity, id, tags);
  return (await readEntityTags(client, entity, id)).map(mapTag);
}

export async function savePeriodTagging(client: TransactionClient, id: string, data: { tags?: string[]; non_thematic?: boolean }) {
  if (data.non_thematic !== undefined) await setPeriodNonThematic(client, id, data.non_thematic);
  return {
    tags: await saveEntityTags(client, 'period', id, data.tags),
    ...(data.non_thematic !== undefined ? { non_thematic: data.non_thematic } : {}),
  };
}
