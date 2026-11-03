<template>
  <div class="user-menu" @keydown="onKeydown" @focusout="onFocusOut">
    <Button ref="triggerComponent" variant="ghost" size="sm" icon-only
      :aria-label="`Compte : ${name}`" :title="`Compte : ${name}`"
      aria-haspopup="menu" :aria-expanded="open" :aria-controls="open ? menuId : undefined"
      @click="toggle" @keydown="onTriggerKeydown">
      <template #icon>
        <UserAvatar v-if="auth.profile" :username="auth.profile.username" :color="auth.profile.avatarColor" :icon="auth.profile.avatarIcon" size="sm" />
        <Icon v-else icon="mdi:account-circle-outline" width="20" height="20" aria-hidden="true" />
      </template>
    </Button>
    <div v-if="open" ref="menu" :id="menuId" class="user-menu__panel" role="menu" :aria-label="`Compte : ${name}`">
      <PopoverSurface padded>
      <div class="user-menu__identity" role="presentation">
        <UserAvatar :username="auth.profile?.username" :color="auth.profile?.avatarColor" :icon="auth.profile?.avatarIcon" />
        <span class="user-menu__identity-text">
          <span class="user-menu__name">{{ name }}</span>
          <span class="user-menu__role">{{ auth.profile === null ? 'Nom d’utilisateur à choisir' : auth.roleLabel }}</span>
        </span>
      </div>
      <RouterLink :to="{ name: 'profile' }" role="menuitem" tabindex="-1" class="user-menu__item" @click="close()">
        <Icon icon="mdi:account-outline" width="16" height="16" aria-hidden="true" />Profil
      </RouterLink>
      <RouterLink :to="{ name: 'profile', query: { section: 'privacy' } }" role="menuitem" tabindex="-1" class="user-menu__item" @click="close()">
        <Icon icon="mdi:shield-lock-outline" width="16" height="16" aria-hidden="true" />Données et confidentialité
      </RouterLink>
      <button type="button" role="menuitem" tabindex="-1" class="user-menu__item" :disabled="signingOut" @click="signOut">
        <Icon icon="mdi:logout" width="16" height="16" aria-hidden="true" />Se déconnecter
      </button>
      </PopoverSurface>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import Button from './base/Button.vue';
import PopoverSurface from './base/PopoverSurface.vue';
import UserAvatar from './UserAvatar.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/composables/useToast';
import { generateDomUid } from '@/utils/generateDomUid';

const auth = useAuthStore(); const router = useRouter(); const route = useRoute(); const toast = useToast();
const open = ref(false); const signingOut = ref(false);
const triggerComponent = ref<InstanceType<typeof Button> | null>(null);
const trigger = computed(() => triggerComponent.value?.$el as HTMLButtonElement | undefined);
const menu = ref<HTMLElement | null>(null);
const menuId = generateDomUid('user-menu');
const name = computed(() => auth.profile?.username || 'Mon compte');
const items = () => [...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) void nextTick(() => trigger.value?.focus());
}
async function show(last = false) {
  open.value = true;
  await nextTick();
  const options = items(); options[last ? options.length - 1 : 0]?.focus();
}
function toggle() { if (open.value) close(true); else void show(); }
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try { await auth.signOut(); close(); await router.replace('/timeline'); }
  catch { toast.show('Déconnexion impossible. Réessayez.', 'error'); }
  finally { signingOut.value = false; }
}
function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); void show(event.key === 'ArrowUp'); }
}
function onKeydown(event: KeyboardEvent) {
  if (!open.value) return;
  // Le menu consomme Échap avant la fenêtre ou un dialogue.
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
  if (!menu.value?.contains(event.target as Node)) return;
  if (event.key === 'Tab') { close(); return; }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const options = items();
  const index = options.indexOf(document.activeElement as HTMLElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
  options[next]?.focus();
}
function onFocusOut(event: FocusEvent) {
  const target = event.relatedTarget as Node | null;
  if (target && !menu.value?.contains(target) && !trigger.value?.contains(target)) close();
}
function outside(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && !menu.value?.contains(target) && !trigger.value?.contains(target)) close();
}
watch(open, value => {
  if (value) document.addEventListener('pointerdown', outside, true);
  else document.removeEventListener('pointerdown', outside, true);
}, { flush: 'sync' });
watch(() => route.fullPath, () => close());
onMounted(() => { void auth.ensureProfile(); });
onScopeDispose(() => document.removeEventListener('pointerdown', outside, true));
</script>

<style scoped>
.user-menu { position: relative; display: inline-flex; }
.user-menu__panel {
  position: absolute; top: calc(100% + var(--spacing-xs)); right: 0; z-index: var(--z-index-popover);
  width: 260px; max-width: calc(100vw - 2 * var(--spacing-md)); box-sizing: border-box;
}
.user-menu__identity {
  display: flex; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-sm); margin-bottom: var(--spacing-xs); border-bottom: 1px solid var(--color-border-default);
}
.user-menu__identity-text { display: flex; flex-direction: column; min-width: 0; }
.user-menu__name { font-weight: var(--font-weight-semibold); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-menu__role { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.user-menu__item {
  display: flex; align-items: center; gap: var(--spacing-sm); width: 100%; box-sizing: border-box; padding: var(--spacing-sm);
  border: 0; border-radius: var(--radius-sm); background: transparent;
  color: var(--color-text-primary); font: inherit; font-size: var(--font-size-sm); text-align: left; text-decoration: none; cursor: pointer;
}
.user-menu__item:hover, .user-menu__item:focus-visible { background: var(--color-interaction-hover); }
.user-menu__item:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.user-menu__item:disabled { cursor: default; opacity: 0.6; }
</style>
