export class NotFoundError extends Error {}
export class PeriodHierarchyError extends Error {
  constructor(public readonly status: 400 | 404 | 409, message: string) { super(message); }
}
export class PeriodDeletionError extends Error {
  constructor(public readonly status: 404 | 409, message: string) { super(message); }
}
export class StoryAssociationError extends Error {
  constructor(public readonly status: 400 | 404 | 409, message: string) { super(message); }
}
