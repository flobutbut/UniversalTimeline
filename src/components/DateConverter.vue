<template>
  <div class="date-converter">
    <h2>Convertisseur de Dates</h2>
    
    <!-- Formulaire de saisie -->
    <div class="input-section">
      <BaseInput
        v-model="inputDate"
        label="Date à convertir"
        placeholder="Ex: -3600000000-01-01T00:00:00Z, 18 avril 1923, 800 BCE, 4 Ma"
        @input="convertInputDate"
      />
      
      <div class="format-selector">
        <BaseSelect
          v-model="selectedInputFormat"
          :options="inputFormatOptions"
          label="Format d'entrée"
          placeholder="Détection automatique"
        />
      </div>
    </div>

    <!-- Résultats de conversion -->
    <div v-if="convertedDate && convertedDate.isValid" class="results-section">
      <h3>Résultats de conversion</h3>
      
      <div class="conversion-grid">
        <div class="conversion-card">
          <h4>Format ISO8601</h4>
          <p class="date-value">{{ convertedDate.iso8601 }}</p>
        </div>
        
        <div class="conversion-card">
          <h4>Format Moderne</h4>
          <p class="date-value">{{ convertedDate.modern }}</p>
        </div>
        
        <div class="conversion-card">
          <h4>Format BCE</h4>
          <p class="date-value">{{ convertedDate.bce }}</p>
        </div>
        
        <div class="conversion-card">
          <h4>Format Géologique</h4>
          <p class="date-value">{{ convertedDate.geological }}</p>
        </div>
      </div>

      <!-- Informations détaillées -->
      <div class="details-section">
        <h4>Informations détaillées</h4>
        <div class="details-grid">
          <div class="detail-item">
            <span class="label">Années:</span>
            <span class="value">{{ convertedDate.years.toLocaleString() }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Années depuis maintenant:</span>
            <span class="value">{{ convertedDate.yearsFromNow.toLocaleString() }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Précision:</span>
            <span class="value">{{ convertedDate.precision }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Époque:</span>
            <span class="value">{{ convertedDate.isBCE ? 'Avant notre ère' : 'Notre ère' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Gestion d'erreur -->
    <div v-if="error" class="error-section">
      <p class="error-message">{{ error }}</p>
    </div>

    <!-- Exemples d'utilisation -->
    <div class="examples-section">
      <h3>Exemples d'utilisation</h3>
      <div class="examples-grid">
        <div 
          v-for="example in examples" 
          :key="example.input"
          class="example-card"
          @click="loadExample(example.input)"
        >
          <h4>{{ example.label }}</h4>
          <p class="example-input">{{ example.input }}</p>
          <p class="example-output">{{ example.output }}</p>
        </div>
      </div>
    </div>

    <!-- Tests de conversion croisée -->
    <div class="cross-conversion-section">
      <h3>Tests de conversion croisée</h3>
      <div class="test-buttons">
        <BaseButton @click="runCrossConversionTests">
          Lancer les tests de conversion
        </BaseButton>
      </div>
      
      <div v-if="testResults.length > 0" class="test-results">
        <div 
          v-for="result in testResults" 
          :key="result.test"
          class="test-result"
          :class="{ 'test-pass': result.passed, 'test-fail': !result.passed }"
        >
          <span class="test-name">{{ result.test }}</span>
          <span class="test-status">{{ result.passed ? '✅' : '❌' }}</span>
          <span v-if="!result.passed" class="test-error">{{ result.error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDateConversion } from '@/composables/useDateConversion';
import BaseInput from '@/components/base/Input.vue';
import BaseSelect from '@/components/base/Select.vue';
import BaseButton from '@/components/base/Button.vue';

// Utilisation du composable
const {
  convertedDate,
  error,
  convertDate,
} = useDateConversion({
  defaultLocale: 'fr-FR',
  defaultPrecision: 'year',
  includeTime: false
});

// État local
const inputDate = ref('');
const selectedInputFormat = ref<'auto' | 'iso8601' | 'modern' | 'bce' | 'geological'>('auto');
const testResults = ref<Array<{ test: string; passed: boolean; error?: string }>>([]);

// Options pour le sélecteur de format
const inputFormatOptions = [
  { value: 'auto', label: 'Détection automatique' },
  { value: 'iso8601', label: 'ISO8601' },
  { value: 'modern', label: 'Moderne' },
  { value: 'bce', label: 'BCE' },
  { value: 'geological', label: 'Géologique' }
];

// Exemples d'utilisation
const examples = [
  {
    label: 'Date ISO8601 très ancienne',
    input: '-3600000000-01-01T00:00:00Z',
    output: '3.60 Ga'
  },
  {
    label: 'Date moderne',
    input: '18 avril 1923',
    output: '18 avril 1923'
  },
  {
    label: 'Date BCE',
    input: '800 BCE',
    output: '800 BCE'
  },
  {
    label: 'Date géologique (Ma)',
    input: '4 Ma',
    output: '4.00 Ma'
  },
  {
    label: 'Date géologique (Ga)',
    input: '4.5 Ga',
    output: '4.50 Ga'
  },
  {
    label: 'Date en milliers d\'années',
    input: '40 ka',
    output: '40.00 ka'
  }
];

// Méthodes
const convertInputDate = () => {
  if (inputDate.value.trim()) {
    const format = selectedInputFormat.value === 'auto' ? undefined : selectedInputFormat.value;
    convertDate(inputDate.value, { inputFormat: format });
  }
};

const loadExample = (exampleInput: string) => {
  inputDate.value = exampleInput;
  convertInputDate();
};

const runCrossConversionTests = () => {
  testResults.value = [];
  
  const tests = [
    {
      test: 'ISO8601 → Géologique → ISO8601',
      input: '-4000000-01-01T00:00:00Z',
      expected: '4.00 Ma'
    },
    {
      test: 'BCE → Moderne → BCE',
      input: '800 BCE',
      expected: '800 BCE'
    },
    {
      test: 'Géologique → ISO8601 → Géologique',
      input: '4 Ma',
      expected: '4.00 Ma'
    }
  ];

  tests.forEach(test => {
    try {
      const converted = convertDate(test.input);
      if (converted && converted.isValid) {
        const backConverted = convertDate(converted.iso8601, { inputFormat: 'iso8601' });
        if (backConverted) {
          const passed = backConverted.geological === test.expected;
          
          testResults.value.push({
            test: test.test,
            passed,
            error: passed ? undefined : `Attendu: ${test.expected}, Obtenu: ${backConverted.geological}`
          });
        } else {
          testResults.value.push({
            test: test.test,
            passed: false,
            error: 'Reconversion échouée'
          });
        }
      } else {
        testResults.value.push({
          test: test.test,
          passed: false,
          error: 'Conversion échouée'
        });
      }
    } catch (err) {
      testResults.value.push({
        test: test.test,
        passed: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      });
    }
  });
};

// Initialisation
onMounted(() => {
  // Charger un exemple par défaut
  loadExample(examples[0].input);
});
</script>

<style scoped>
.date-converter {
  max-width: calc(var(--spacing-xs) * 300);
  margin: 0 auto;
  padding: 2rem;
}

.input-section {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1rem;
  margin-bottom: 2rem;
}

.results-section {
  margin-bottom: 2rem;
}

.conversion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.conversion-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.conversion-card h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-heading);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-value {
  font-family: var(--font-family-mono);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  word-break: break-all;
}

.details-section {
  background: var(--color-background-mute);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: var(--color-text-light);
}

.value {
  font-weight: 600;
  color: var(--color-text);
}

.error-section {
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-bottom: 2rem;
}

.error-message {
  color: var(--color-error);
  margin: 0;
}

.examples-section {
  margin-bottom: 2rem;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.example-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.example-card:hover {
  background: var(--color-background-mute);
  border-color: var(--color-primary);
}

.example-card h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-heading);
}

.example-input {
  font-family: var(--font-family-mono);
  font-size: 0.9rem;
  color: var(--color-text-light);
  margin: 0.25rem 0;
}

.example-output {
  font-weight: 600;
  color: var(--color-primary);
  margin: 0.25rem 0 0 0;
}

.cross-conversion-section {
  margin-bottom: 2rem;
}

.test-buttons {
  margin-bottom: 1rem;
}

.test-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--color-background-soft);
}

.test-pass {
  border-left: 4px solid var(--color-success);
}

.test-fail {
  border-left: 4px solid var(--color-error);
}

.test-name {
  flex: 1;
  font-weight: 500;
}

.test-status {
  font-size: 1.2rem;
}

.test-error {
  color: var(--color-error);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .input-section {
    grid-template-columns: 1fr;
  }
  
  .conversion-grid {
    grid-template-columns: 1fr;
  }
  
  .examples-grid {
    grid-template-columns: 1fr;
  }
}
</style> 