import { parseTemporal, periodDateErrors } from '@temporal';
import type { EditFormType } from '@/types/editForm';
import { wikipediaTitleFromInput } from '@/lib/wikipedia';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fields: Record<string, string>;
}
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const result = (fields: Record<string, string>): ValidationResult => ({ isValid: !Object.keys(fields).length, errors: Object.values(fields), fields });

/** Draft validation gives field feedback; the server independently validates the wire contract. */
export class EditFormValidator {
  static validateQid(value: unknown): ValidationResult {
    const valid = typeof value === 'string' && /^Q[1-9]\d*$/i.test(value.trim()) && value.length <= 200;
    return result(valid ? {} : { qid: 'Saisissez un Q-id Wikidata valide, par exemple Q12345.' });
  }

  static validateForm(value: unknown, type: EditFormType): ValidationResult {
    const data = record(value);
    if (!data || !['period','event','story'].includes(type)) return result({ form: 'Formulaire invalide.' });
    const fields: Record<string, string> = {};
    const text = (value: unknown, key: string, name: string, max: number, required = false) => {
      if (value == null && !required) return;
      if (typeof value !== 'string' || value.includes('\0')) { fields[key] = `${name} doit être un texte.`; return; }
      if (required && !value.trim()) fields[key] = `${name} est obligatoire.`;
      else if (value.length > max) fields[key] = `${name} ne peut pas dépasser ${max} caractères.`;
    };
    const title = record(data.title);
    const description = data.description == null ? {} : record(data.description);
    text(title?.fr, 'title.fr', 'Le titre en français', 255, true);
    text(title?.en, 'title.en', 'Le titre en anglais', 255);
    if (!description) fields.description = 'La description doit contenir des textes par langue.';
    else {
      text(description.fr, 'description.fr', 'La description en français', 1000);
      text(description.en, 'description.en', 'La description en anglais', 1000);
    }
    if (type === 'story') {
      // L'auteur est signé par le compte côté serveur ; une valeur héritée reste seulement bornée.
      text(data.author, 'author', 'L’auteur', 255);
      if (data.isPublic !== undefined && typeof data.isPublic !== 'boolean') fields.isPublic = 'La visibilité doit être un booléen.';
    } else {
      if (data.qid != null && data.qid !== '' && !(typeof data.qid === 'string' && !data.qid.trim())) Object.assign(fields, this.validateQid(data.qid).fields);
      const keys = type === 'period' ? ['startDate','endDate'] as const : ['date'] as const;
      for (const key of keys) {
        text(data[key], key, key === 'startDate' ? 'La date de début' : key === 'endDate' ? 'La date de fin' : 'La date', 255, key !== 'endDate');
        if (typeof data[key] === 'string') {
          if (/[\u0000-\u001f\u007f]/.test(data[key])) fields[key] = 'La date doit tenir sur une seule ligne.';
          const parsed = parseTemporal(data[key]);
          if (parsed.kind === 'unknown' && parsed.reason === 'invalid') fields[key] = 'La date est invalide.';
        }
      }
      if (type === 'period' && typeof data.startDate === 'string' && typeof data.endDate === 'string') {
        const errors = periodDateErrors(data.startDate, data.endDate.trim() || 'NOW');
        if (errors.start) fields.startDate = errors.start;
        if (errors.end) fields.endDate = errors.end;
      }
      const wikipedia = data.wikipedia == null ? {} : record(data.wikipedia);
      if (!wikipedia) fields.wikipedia = 'Les articles Wikipédia doivent être indiqués par langue.';
      else for (const language of ['fr', 'en'] as const) {
        const value = wikipedia[language];
        if (value == null || value === '') continue;
        if (typeof value !== 'string' || wikipediaTitleFromInput(value, language) === undefined) {
          fields[`wikipedia.${language}`] = `Indiquez le titre de l’article ou son adresse sur ${language}.wikipedia.org, sans les caractères # < > [ ] | { }.`;
        }
      }
      if (type === 'period' && data.parentId !== undefined && data.parentId !== null && (typeof data.parentId !== 'string' || !data.parentId.trim() || data.parentId.length > 200 || /[\u0000-\u001f\u007f]/.test(data.parentId))) fields.parentId = 'Le parent doit être un identifiant valide ou vide.';
    }
    if (data.categories !== undefined && (!Array.isArray(data.categories) || data.categories.length > 500 || data.categories.some(category => {
      const id = typeof category === 'string' ? category : record(category)?.id;
      return typeof id !== 'string' || !id.trim() || id.length > 200 || /[\u0000-\u001f\u007f]/.test(id);
    }))) fields.categories = 'La sélection de catégories est invalide.';
    return result(fields);
  }
}
