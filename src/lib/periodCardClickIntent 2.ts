import type { ListPeriod } from '@/types/database';

export type PeriodCardClickIntent = 'back' | 'select' | 'none';

/** Intention de clic sur une carte période (timeline vs parent). */
export function getPeriodCardClickIntent(
  variant: 'timeline' | 'parent',
  period: Pick<ListPeriod, 'hasChildren'>
): PeriodCardClickIntent {
  if (variant === 'parent') return 'back';
  if (!period.hasChildren) return 'none';
  return 'select';
}
