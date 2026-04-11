import { generateUUID } from '@/utils/uuid';

/** Données formulaire minimales pour id + wikidata + label/description (création event/période). */
export type NewEntityFormCore = {
  qid?: string | null;
  title: { fr: string; en?: string };
  description?: { fr?: string; en?: string } | null;
};

/** Champs communs aux POST `/events` et `/periods` : id, wikidata_id, label et description bilingues. */
export function buildNewEntityCoreFields(formData: NewEntityFormCore) {
  return {
    id: generateUUID(),
    wikidata_id: formData.qid || null,
    label: { fr: formData.title.fr, en: formData.title.en || formData.title.fr },
    description: {
      fr: formData.description?.fr || null,
      en: formData.description?.en || formData.description?.fr || null,
    },
  };
}
