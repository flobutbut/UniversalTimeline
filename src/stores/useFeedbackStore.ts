import { ref } from 'vue';
import { defineStore } from 'pinia';
import { feedbackApi } from '@/services/FeedbackApiService';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';

export const useFeedbackStore = defineStore('feedback', () => {
  const enabled = ref(false), loaded = ref(false), saving = ref(false), error = ref('');
  let request = 0;
  async function refresh() {
    if (saving.value) return;
    const current = ++request;
    try {
      const settings = await feedbackApi.settings();
      if (current === request) { enabled.value = settings.enabled; loaded.value = true; error.value = ''; }
    } catch (cause) {
      if (current === request) {
        enabled.value = false; loaded.value = false;
        error.value = mutationErrorMessage(cause, 'Lecture des paramètres impossible.');
      }
    }
  }
  async function setEnabled(value: boolean) {
    if (saving.value) return;
    ++request; saving.value = true; error.value = '';
    try { enabled.value = (await feedbackApi.setEnabled(value)).enabled; loaded.value = true; }
    catch (cause) { error.value = mutationErrorMessage(cause, 'Enregistrement des paramètres impossible.'); }
    finally { saving.value = false; }
  }
  return { enabled, loaded, saving, error, refresh, setEnabled };
});
