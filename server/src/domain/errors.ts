export class NotFoundError extends Error {}
export class WikidataGenerationConflictError extends Error {
  constructor(public readonly existingStories: { id: string; title: string; reason: 'subject' | 'title' }[]) {
    super('Une frise correspondante existe déjà. Ouvrez-la ou confirmez la création d’une autre frise.');
  }
}
export class PeriodHierarchyError extends Error {
  constructor(public readonly status: 400 | 404 | 409, message: string) { super(message); }
}
export class PeriodDeletionError extends Error {
  constructor(public readonly status: 404 | 409, message: string) { super(message); }
}
export class StoryAssociationError extends Error {
  constructor(public readonly status: 400 | 404 | 409, message: string) { super(message); }
}
export class AdminError extends Error {
  constructor(public readonly status: 403 | 404 | 409, message: string) { super(message); }
}
export class ProfileError extends Error {
  constructor(public readonly status: 404 | 409 | 412, message: string) { super(message); }
}
export class CatalogueConversionError extends Error {
  constructor(public readonly status: 404 | 409, message: string) { super(message); }
}
