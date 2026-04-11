import { defineComponent } from 'vue';

/**
 * Les vues principales sont rendues dans App.vue (pas de RouterView).
 * Vue Router exige un composant valide : une fonction renvoyant null seule est
 * traitée comme un lazy loader et fait planter la résolution de route.
 */
export const AppRouteShell = defineComponent({
  name: 'AppRouteShell',
  setup() {
    return () => null;
  },
});
