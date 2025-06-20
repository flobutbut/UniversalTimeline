export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationField {
  value: any;
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: any) => string | null;
}

export class EditFormValidator {
  // Validation d'un Q-id Wikidata
  static validateQid(qid: string): ValidationResult {
    const errors: string[] = [];

    if (!qid) {
      errors.push('Le Q-id est requis');
      return { isValid: false, errors };
    }

    if (!qid.match(/^Q\d+$/)) {
      errors.push('Format de Q-id invalide (doit commencer par Q suivi de chiffres)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation d'un titre
  static validateTitle(title: { fr: string; en: string }): ValidationResult {
    const errors: string[] = [];

    if (!title.fr || title.fr.trim() === '') {
      errors.push('Le titre en français est obligatoire');
    }

    if (title.fr && title.fr.length > 255) {
      errors.push('Le titre en français ne peut pas dépasser 255 caractères');
    }

    if (title.en && title.en.length > 255) {
      errors.push('Le titre en anglais ne peut pas dépasser 255 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation d'une description
  static validateDescription(description: { fr: string; en: string }): ValidationResult {
    const errors: string[] = [];

    if (description.fr && description.fr.length > 1000) {
      errors.push('La description en français ne peut pas dépasser 1000 caractères');
    }

    if (description.en && description.en.length > 1000) {
      errors.push('La description en anglais ne peut pas dépasser 1000 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation d'une date
  static validateDate(date: string, fieldName: string): ValidationResult {
    const errors: string[] = [];

    if (!date || date.trim() === '') {
      errors.push(`${fieldName} est obligatoire`);
      return { isValid: false, errors };
    }

    // Pas de validation de format - accepte n'importe quel texte brut
    return {
      isValid: true,
      errors
    };
  }

  // Validation d'une période
  static validatePeriod(data: {
    qid: string;
    title: { fr: string; en: string };
    description: { fr: string; en: string };
    startDate: string;
    endDate: string;
    location: string;
  }): ValidationResult {
    const errors: string[] = [];

    // Validation du Q-id
    const qidValidation = this.validateQid(data.qid);
    if (!qidValidation.isValid) {
      errors.push(...qidValidation.errors);
    }

    // Validation du titre
    const titleValidation = this.validateTitle(data.title);
    if (!titleValidation.isValid) {
      errors.push(...titleValidation.errors);
    }

    // Validation de la description
    const descriptionValidation = this.validateDescription(data.description);
    if (!descriptionValidation.isValid) {
      errors.push(...descriptionValidation.errors);
    }

    // Validation des dates
    const startDateValidation = this.validateDate(data.startDate, 'La date de début');
    if (!startDateValidation.isValid) {
      errors.push(...startDateValidation.errors);
    }

    const endDateValidation = this.validateDate(data.endDate, 'La date de fin');
    if (!endDateValidation.isValid) {
      errors.push(...endDateValidation.errors);
    }

    // Validation de la cohérence des dates
    if (startDateValidation.isValid && endDateValidation.isValid) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (startDate >= endDate) {
        errors.push('La date de début doit être antérieure à la date de fin');
      }
    }

    // Validation de la localisation
    if (data.location && data.location.length > 255) {
      errors.push('La localisation ne peut pas dépasser 255 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation d'un événement
  static validateEvent(data: {
    qid: string;
    title: { fr: string; en: string };
    description: { fr: string; en: string };
    date: string;
    location: string;
  }): ValidationResult {
    const errors: string[] = [];

    // Validation du Q-id
    const qidValidation = this.validateQid(data.qid);
    if (!qidValidation.isValid) {
      errors.push(...qidValidation.errors);
    }

    // Validation du titre
    const titleValidation = this.validateTitle(data.title);
    if (!titleValidation.isValid) {
      errors.push(...titleValidation.errors);
    }

    // Validation de la description
    const descriptionValidation = this.validateDescription(data.description);
    if (!descriptionValidation.isValid) {
      errors.push(...descriptionValidation.errors);
    }

    // Validation de la date
    const dateValidation = this.validateDate(data.date, 'La date');
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }

    // Validation de la localisation
    if (data.location && data.location.length > 255) {
      errors.push('La localisation ne peut pas dépasser 255 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation d'une story
  static validateStory(data: {
    title: { fr: string; en: string };
    description: { fr: string; en: string };
    author: string;
  }): ValidationResult {
    const errors: string[] = [];

    // Validation du titre
    const titleValidation = this.validateTitle(data.title);
    if (!titleValidation.isValid) {
      errors.push(...titleValidation.errors);
    }

    // Validation de la description
    const descriptionValidation = this.validateDescription(data.description);
    if (!descriptionValidation.isValid) {
      errors.push(...descriptionValidation.errors);
    }

    // Validation de l'auteur
    if (!data.author || data.author.trim() === '') {
      errors.push('L\'auteur est obligatoire');
    } else if (data.author.length > 255) {
      errors.push('Le nom de l\'auteur ne peut pas dépasser 255 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation générique d'un champ
  static validateField(field: ValidationField, fieldName: string): ValidationResult {
    const errors: string[] = [];

    // Validation de la présence si requis
    if (field.required && (!field.value || field.value.toString().trim() === '')) {
      errors.push(`${fieldName} est obligatoire`);
      return { isValid: false, errors };
    }

    // Validation de la longueur minimale
    if (field.minLength && field.value && field.value.toString().length < field.minLength) {
      errors.push(`${fieldName} doit contenir au moins ${field.minLength} caractères`);
    }

    // Validation de la longueur maximale
    if (field.maxLength && field.value && field.value.toString().length > field.maxLength) {
      errors.push(`${fieldName} ne peut pas dépasser ${field.maxLength} caractères`);
    }

    // Validation du pattern
    if (field.pattern && field.value && !field.pattern.test(field.value.toString())) {
      errors.push(`${fieldName} ne respecte pas le format attendu`);
    }

    // Validation personnalisée
    if (field.customValidator && field.value) {
      const customError = field.customValidator(field.value);
      if (customError) {
        errors.push(customError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation complète d'un formulaire
  static validateForm(data: any, type: 'period' | 'event' | 'story'): ValidationResult {
    switch (type) {
      case 'period':
        return this.validatePeriod(data);
      case 'event':
        return this.validateEvent(data);
      case 'story':
        return this.validateStory(data);
      default:
        return {
          isValid: false,
          errors: ['Type de formulaire non supporté']
        };
    }
  }
} 