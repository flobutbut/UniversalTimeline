# Service de Conversion de Dates

Ce service permet de convertir des dates entre différents formats temporels, incluant les dates très anciennes (géologiques) et les dates modernes.

## Formats Supportés

### 1. Format ISO8601
- **Format**: `-3600000000-01-01T00:00:00Z`
- **Exemple**: `-4000000-01-01T00:00:00Z` (4 millions d'années)
- **Utilisation**: Format standard pour les dates très anciennes

### 2. Format Moderne
- **Format**: `18 avril 1923`
- **Exemple**: `15 janvier 2024`
- **Utilisation**: Dates récentes en français

### 3. Format BCE (Before Common Era)
- **Format**: `800 BCE`, `-800`, `800 avant J.-C.`
- **Exemple**: `800 BCE`, `-500`
- **Utilisation**: Dates historiques avant notre ère

### 4. Format Géologique
- **Format**: `4 Ma`, `4.5 Ga`, `40 ka`, `40000 ans`
- **Exemples**: 
  - `4 Ma` = 4 millions d'années
  - `4.5 Ga` = 4.5 milliards d'années
  - `40 ka` = 40 milliers d'années
- **Utilisation**: Dates géologiques et préhistoriques

## Utilisation

### Service Direct

```typescript
import { DateConversionService } from '@/services/DateConversionService';

// Conversion simple
const result = DateConversionService.convertDate('4 Ma');
console.log(result.geological); // "4.00 Ma"
console.log(result.iso8601);    // "-4000000-01-01T00:00:00Z"
console.log(result.modern);     // "4.00 Ma" (car trop ancien pour format moderne)

// Conversion avec options
const result2 = DateConversionService.convertDate('18 avril 1923', {
  inputFormat: 'modern',
  outputFormat: 'iso8601',
  locale: 'fr-FR'
});

// Conversion de plage
const range = DateConversionService.convertDateRange('4 Ma', '2 Ma');
console.log(range.duration?.geological); // "2.00 Ma"
```

### Composable Vue 3

```vue
<script setup>
import { useDateConversion } from '@/composables/useDateConversion';

const {
  convertedDate,
  isLoading,
  error,
  convertDate,
  formatForDisplay,
  fromISO8601,
  toISO8601
} = useDateConversion({
  defaultLocale: 'fr-FR',
  defaultPrecision: 'year',
  includeTime: false
});

// Conversion automatique
convertDate('800 BCE');

// Utilisation des propriétés réactives
console.log(convertedDate.value?.geological); // "800 BCE"
console.log(convertedDate.value?.years);      // 800
</script>

<template>
  <div v-if="convertedDate && convertedDate.isValid">
    <p>Format moderne: {{ convertedDate.modern }}</p>
    <p>Format géologique: {{ convertedDate.geological }}</p>
    <p>Années: {{ convertedDate.years }}</p>
  </div>
  
  <div v-if="error" class="error">
    {{ error }}
  </div>
</template>
```

## API du Service

### `DateConversionService.convertDate(dateString, options?)`

Convertit une date vers tous les formats supportés.

**Paramètres :**
- `dateString`: Chaîne de date à convertir
- `options`: Options de conversion (optionnel)

**Retourne :**
```typescript
interface ConvertedDate {
  original: string;
  iso8601: string;
  modern: string;
  bce: string;
  geological: string;
  years: number;
  yearsFromNow: number;
  isBCE: boolean;
  precision: string;
  isValid: boolean;
  error?: string;
}
```

### `DateConversionService.convertDateRange(startDate, endDate, options?)`

Convertit une plage de dates.

**Retourne :**
```typescript
interface DateRange {
  start: ConvertedDate;
  end: ConvertedDate;
  duration?: {
    years: number;
    geological: string;
    modern: string;
  };
}
```

### `DateConversionService.formatForDisplay(dateString, context?)`

Formate une date pour l'affichage selon le contexte.

**Contextes disponibles :**
- `'timeline'`: Format compact pour les timelines
- `'detail'`: Format détaillé avec toutes les informations
- `'search'`: Format pour la recherche

## Options de Conversion

```typescript
interface DateConversionOptions {
  inputFormat?: 'iso8601' | 'modern' | 'bce' | 'geological' | 'auto';
  outputFormat?: 'iso8601' | 'modern' | 'bce' | 'geological' | 'years';
  precision?: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
  locale?: string;
  includeTime?: boolean;
}
```

## Seuils Géologiques

Le service utilise les seuils suivants pour déterminer le format d'affichage :

- **Ga (Giga-années)**: ≥ 1 000 000 000 ans
- **Ma (Méga-années)**: ≥ 1 000 000 ans
- **ka (kilo-années)**: ≥ 1 000 ans
- **ans**: < 1 000 ans

## Exemples d'Utilisation

### Conversion ISO8601 → Géologique
```typescript
const result = DateConversionService.convertDate('-4000000-01-01T00:00:00Z');
console.log(result.geological); // "4.00 Ma"
```

### Conversion BCE → Moderne
```typescript
const result = DateConversionService.convertDate('800 BCE');
console.log(result.modern); // "800 BCE" (car trop ancien pour format moderne)
```

### Conversion Géologique → ISO8601
```typescript
const result = DateConversionService.convertDate('4 Ma');
console.log(result.iso8601); // "-4000000-01-01T00:00:00Z"
```

### Formatage pour Timeline
```typescript
const display = DateConversionService.formatForDisplay('4 Ma', 'timeline');
console.log(display); // "4.00 Ma"
```

## Tests

Le service inclut une suite de tests complète dans `src/services/__tests__/DateConversionService.test.ts`.

Pour exécuter les tests :
```bash
yarn test DateConversionService
```

## Intégration avec l'Application

Le service est intégré dans l'application via :

1. **Service direct** : Pour les conversions programmatiques
2. **Composable Vue** : Pour l'utilisation dans les composants Vue
3. **Composant de démonstration** : `DateConverter.vue` pour tester les conversions

## Limitations

- Les dates très anciennes (> 5 milliards d'années) sont rejetées
- La précision est limitée à l'année pour les dates géologiques
- Le format moderne n'est utilisé que pour les dates récentes (< 1 million d'années) 