import { nextTick, onMounted, onBeforeUnmount, type Ref } from 'vue';
import { generateDomUid } from '@/utils/generateDomUid';

interface DialogLayer { id: string; element: Ref<HTMLElement | undefined>; focus: () => void }
const layers: DialogLayer[] = [];
const inertBefore = new Map<Element, boolean>();
const focusable = 'button, [href], input, select, textarea, [tabindex]';

function restoreBackground() {
  for (const [element, wasInert] of inertBefore) if (!wasInert) element.removeAttribute('inert');
  inertBefore.clear();
}
function updateBackground() {
  restoreBackground();
  const top = layers[layers.length - 1];
  let current: Element | null = top?.element.value ?? null;
  if (!current?.isConnected) return;
  // Inert siblings along the ancestor path, so dialogs can also live inside App.
  while (current && current !== document.body) {
    const parent: Element | null = current.parentElement;
    for (const sibling of Array.from(parent?.children ?? [])) {
      if (sibling === current || sibling.getAttribute('data-dialog-owner') === top!.id || sibling.hasAttribute('data-ui-feedback')) continue;
      inertBefore.set(sibling, sibling.hasAttribute('inert'));
      sibling.setAttribute('inert', '');
    }
    current = parent;
  }
}

/** Focus, background isolation and Escape belong only to the top dialog. */
export function useDialog(element: Ref<HTMLElement | undefined>, options: { close: () => void; busy?: () => boolean; initialFocus?: string }) {
  const id = generateDomUid('dialog');
  const layer = { id, element, focus: () => focusFirst() };
  let previousFocus: HTMLElement | null = null;
  const isTop = () => layers[layers.length - 1] === layer;
  const roots = () => [element.value, ...document.querySelectorAll<HTMLElement>(`[data-dialog-owner="${id}"]`)].filter((el): el is HTMLElement => !!el);
  const owns = (target: EventTarget | null) => target instanceof Node && roots().some(root => root.contains(target));
  function tabbable() {
    return roots().flatMap(root => Array.from(root.querySelectorAll<HTMLElement>(focusable))).filter(el => {
      if (el.tabIndex < 0 || el.matches(':disabled') || el.closest('[inert], [hidden]')) return false;
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
      }
      return true;
    });
  }
  function focusFirst() {
    const items = tabbable();
    const initial = options.initialFocus ? items.find(el => el.matches(options.initialFocus!)) : undefined;
    (initial ?? items[0] ?? element.value)?.focus();
  }
  function handleFocus(e: FocusEvent) { if (isTop() && !owns(e.target)) focusFirst(); }
  function handleKey(e: KeyboardEvent) {
    if (!isTop() || e.defaultPrevented) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!options.busy?.()) options.close();
    } else if (e.key === 'Tab') {
      const items = tabbable(); const first = items[0]; const last = items[items.length - 1];
      if (!items.length) { e.preventDefault(); element.value?.focus(); }
      else if (!owns(document.activeElement) || (e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
        e.preventDefault(); (e.shiftKey ? last : first)?.focus();
      }
    }
  }
  onMounted(async () => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    layers.push(layer); updateBackground();
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('keydown', handleKey);
    await nextTick(); if (isTop()) focusFirst();
  });
  onBeforeUnmount(() => {
    const wasTop = isTop();
    const index = layers.indexOf(layer); if (index >= 0) layers.splice(index, 1);
    document.removeEventListener('focusin', handleFocus, true);
    document.removeEventListener('keydown', handleKey);
    updateBackground();
    // Vue removes the DOM after this hook; exclude closing controls from the
    // parent’s fallback focus while a nested dialog is being unmounted.
    element.value?.setAttribute('inert', '');
    if (wasTop) {
      if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus();
      else layers[layers.length - 1]?.focus();
    }
  });
  return { dialogId: id, isTop };
}
