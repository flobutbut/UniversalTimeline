import type { StoryTimeRange } from '@/lib/storyTimeFilter';

export interface FilterType { key: string; label: string; icon: string; trigger?: boolean; disabled?: boolean }
export interface ActiveFilter { key: string; type: string; label: string }

export interface PeriodFilter { id: string; label: string; range: StoryTimeRange }
