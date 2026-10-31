import { query } from '../api/database.js';
import { listTemporalCandidates } from '../repositories/storyRepository.js';
import { aggregateStoryTemporalBounds } from '../domain/storyTemporalBounds.js';
export async function loadStoryTemporalBounds() {
  return aggregateStoryTemporalBounds(await listTemporalCandidates({ query }));
}
