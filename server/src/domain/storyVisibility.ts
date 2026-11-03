/** A frise without a parent is a draft and stays private. One already public keeps its visibility. */
export const PRIVATE_DRAFT_MESSAGE = 'Une frise sans frise parente reste privée : rattachez-la d’abord à sa frise parente.';
export function refusesPublication(requested: boolean | undefined, current: { isPublic: boolean; parentStoryId: string | null }): boolean {
  return requested === true && !current.isPublic && current.parentStoryId === null;
}
