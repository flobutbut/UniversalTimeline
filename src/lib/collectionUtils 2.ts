export function findById<T extends { id: string }>(items: readonly T[], id: string): T | undefined {
  return items.find((x) => x.id === id);
}
