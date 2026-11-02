import type { PeriodDto, EventDto, ChildStoryDto } from '@/types/api';
import { mapToStory } from '@/services/entityMappers';

/** A complete wire-format snapshot, mapped as a real timeline response would be. */
export const storyFixture = (id: string, periods: PeriodDto[] = [], events: EventDto[] = [], childStories: ChildStoryDto[] = []) =>
  mapToStory({ id, title_fr: `Frise ${id}`, author: '', isPublic: true, periods, events, childStories });
